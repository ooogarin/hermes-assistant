export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export const toPaginationMeta = (totalValue: number | string, page: number, limit: number): PaginationMeta => {
  const total = Number(totalValue);

  return { page, limit, total, total_pages: Math.ceil(total / limit) };
};
