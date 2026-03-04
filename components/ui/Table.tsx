import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  emptyMessage = 'No data available',
  onRowClick,
}: TableProps<T>) {
  // Default keyExtractor uses _id or index
  const getKey = keyExtractor || ((item: T, index?: number) => {
    const id = (item as Record<string, unknown>)._id;
    return id ? String(id) : String(index);
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
        <div className="animate-pulse p-6">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider',
                    column.className
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={getKey(item, index)}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100',
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(item)
                        : String((item as Record<string, unknown>)[column.key as string] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
