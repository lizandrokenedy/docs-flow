import type { DataGridProps } from '@mui/x-data-grid';

/** Skeleton rows instead of the default linear progress overlay while data loads. */
export const dataGridSkeletonLoadingProps: Pick<DataGridProps, 'slotProps'> = {
  slotProps: {
    loadingOverlay: {
      variant: 'skeleton',
    },
  },
};
