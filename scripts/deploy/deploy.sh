#!/usr/bin/env bash
#
# Deploy Hermes to the VPS. Run as the `hermes` user.
#
#   deploy.sh --setup                  One-time server preparation (needs sudo).
#   deploy.sh <git-sha> [dist-dir]     Deploy a commit, optionally with a frontend build.
#
# The deploy refuses to start when the server is not prepared yet, so run
# `--setup` once before the first deploy.

set -Eeuo pipefail

readonly APP_DIR="/opt/hermes/app"
readonly WEB_ROOT="/srv/hermes/web"
readonly INCOMING_DIR="/opt/hermes/deploy/incoming"
readonly BACKUP_DIR="/opt/hermes/backups"
readonly LOCK_FILE="/opt/hermes/deploy/deploy.lock"
readonly SUDOERS_FILE="/etc/sudoers.d/hermes-deploy"
readonly BUN_BIN="${HOME}/.bun/bin/bun"
readonly HEALTH_URL="http://127.0.0.1:3000/health/ready"
readonly BACKUP_RETENTION_DAYS=14

commit_sha="${1:-}"
frontend_source="${2:-}"
previous_sha=""
previous_release=""
release_id=""
finished=false

log() {
  printf '[deploy] %s\n' "$*"
}

die() {
  log "ERROR: $*"
  exit 1
}

setup_server() {
  if [[ "${EUID}" -ne 0 ]]; then
    die "Run 'deploy.sh --setup' with sudo."
  fi

  install -d -o hermes -g hermes -m 0755 /opt/hermes/deploy "${INCOMING_DIR}"
  install -d -o hermes -g hermes -m 0700 "${BACKUP_DIR}"

  # Caddy only needs to read these files; the deploy user owns them.
  chown -R hermes:hermes "${WEB_ROOT}"
  find "${WEB_ROOT}" -type d -exec chmod 0755 {} +
  find "${WEB_ROOT}" -type f -exec chmod 0644 {} +

  # Allow restarting the API without a password, and nothing else.
  printf '%s\n' "hermes ALL=(root) NOPASSWD: /usr/bin/systemctl restart hermes-api" >"${SUDOERS_FILE}"
  chmod 0440 "${SUDOERS_FILE}"

  if ! visudo --check --file="${SUDOERS_FILE}"; then
    rm -f "${SUDOERS_FILE}"
    die "Generated sudoers rule is invalid."
  fi

  log "Server is ready."
}

check_server() {
  if [[ ! -d "${INCOMING_DIR}" || ! -d "${BACKUP_DIR}" ]]; then
    die "Server is not prepared. Run 'sudo bash $0 --setup' once."
  fi

  if ! sudo -n -l /usr/bin/systemctl restart hermes-api >/dev/null 2>&1; then
    die "Cannot control hermes-api without a password. Run 'sudo bash $0 --setup' once."
  fi
}

validate_arguments() {
  if [[ ! "${commit_sha}" =~ ^[0-9a-f]{40}$ ]]; then
    die "Usage: deploy.sh <40-character-git-sha> [frontend-dist-directory]"
  fi

  if [[ -n "${frontend_source}" && ! -f "${frontend_source}/index.html" ]]; then
    die "Frontend directory has no index.html: ${frontend_source}"
  fi
}

read_database_url() {
  local database_url

  database_url="$("${BUN_BIN}" --env-file="${APP_DIR}/.env" -e 'process.stdout.write(process.env.DATABASE_URL ?? "")')"

  if [[ -z "${database_url}" ]]; then
    die "DATABASE_URL is not set in ${APP_DIR}/.env"
  fi

  printf '%s' "${database_url}"
}

update_checkout() {
  cd "${APP_DIR}"

  if [[ -n "$(git status --porcelain)" ]]; then
    die "The checkout at ${APP_DIR} has local changes; resolve them first."
  fi

  git fetch --prune origin
  git merge --ff-only "${commit_sha}"

  log "Checked out ${commit_sha}"
}

backup_database() {
  local database_url
  local target

  database_url="$(read_database_url)"
  target="${BACKUP_DIR}/hermes-${release_id}.dump"

  # The dump holds production data, so keep it private.
  (
    umask 077
    pg_dump --dbname="${database_url}" --format=custom --no-owner --no-privileges --file="${target}"
  )

  if [[ ! -s "${target}" ]]; then
    die "Database backup is empty: ${target}"
  fi

  find "${BACKUP_DIR}" -type f -name 'hermes-*.dump' -mtime "+${BACKUP_RETENTION_DAYS}" -delete

  log "Database backup: ${target}"
}

wait_for_readiness() {
  local deadline
  local response

  deadline=$((SECONDS + 45))

  while [[ "${SECONDS}" -lt "${deadline}" ]]; do
    response="$(curl --fail --silent --show-error --max-time 5 "${HEALTH_URL}" 2>/dev/null || true)"

    if [[ "${response}" == *'"status":"ok"'* ]]; then
      log "API is ready."
      return
    fi

    sleep 2
  done

  die "API did not become ready within 45 seconds."
}

publish_frontend() {
  local release_path

  if [[ -z "${frontend_source}" ]]; then
    log "No frontend build supplied; skipping frontend release."
    return
  fi

  release_path="${WEB_ROOT}/releases/${release_id}"

  install -d -m 0755 "${WEB_ROOT}/releases" "${release_path}"
  rsync -a --delete --chmod=D755,F644 "${frontend_source}/" "${release_path}/"

  # Keep assets from the previous release so open tabs can still load chunks.
  if [[ -n "${previous_release}" && -d "${previous_release}/assets" ]]; then
    rsync -a --ignore-existing --chmod=D755,F644 "${previous_release}/assets/" "${release_path}/assets/"
  fi

  ln -sfnT "${release_path}" "${WEB_ROOT}/current.next"
  mv -Tf "${WEB_ROOT}/current.next" "${WEB_ROOT}/current"

  log "Published frontend release: ${release_path}"
}

rollback() {
  local exit_code=$?

  if [[ "${finished}" == true ]]; then
    return
  fi

  log "Deploy failed with exit code ${exit_code}; rolling back."

  if [[ -n "${previous_sha}" ]]; then
    if cd "${APP_DIR}" && git reset --keep "${previous_sha}"; then
      "${BUN_BIN}" install --frozen-lockfile >/dev/null 2>&1 || true
      sudo -n systemctl restart hermes-api >/dev/null 2>&1 || true
      log "API restored to ${previous_sha}."
    else
      log "Could not restore the API checkout; inspect ${APP_DIR} manually."
    fi
  fi

  if [[ -n "${previous_release}" && -f "${previous_release}/index.html" ]]; then
    ln -sfnT "${previous_release}" "${WEB_ROOT}/current.next"
    mv -Tf "${WEB_ROOT}/current.next" "${WEB_ROOT}/current"
    log "Frontend restored to ${previous_release}."
  fi

  log "Database migrations were not rolled back."
  exit "${exit_code}"
}

main() {
  if [[ "${commit_sha}" == "--setup" ]]; then
    setup_server
    return
  fi

  validate_arguments
  check_server

  install -d -m 0755 "${INCOMING_DIR}"

  exec 9>"${LOCK_FILE}"
  if ! flock --nonblock 9; then
    die "Another deploy is already running."
  fi

  cd "${APP_DIR}"
  previous_sha="$(git rev-parse HEAD)"
  previous_release="$(readlink -f "${WEB_ROOT}/current" 2>/dev/null || true)"
  release_id="$(date -u +%Y%m%dT%H%M%SZ)-${commit_sha:0:7}"

  log "Current commit: ${previous_sha}"

  trap rollback EXIT

  update_checkout
  "${BUN_BIN}" install --frozen-lockfile
  backup_database
  "${BUN_BIN}" run db:migrate
  sudo -n systemctl restart hermes-api
  wait_for_readiness
  publish_frontend

  finished=true
  trap - EXIT

  log "Deployed ${commit_sha} as release ${release_id}."
}

main "$@"
