'use client';

import { Box, Card, CardContent, Container, Skeleton, Stack } from '@mui/material';

export function WizardLoadingSkeleton() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Skeleton variant="text" width="55%" height={44} sx={{ mx: 'auto', mb: 1 }} />
        <Skeleton variant="text" width="70%" height={24} sx={{ mx: 'auto' }} />
      </Box>

      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 3 }}>
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} variant="circular" width={32} height={32} />
        ))}
      </Stack>

      <Card>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={72} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={160} />
        </CardContent>
      </Card>

      <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
        <Skeleton variant="rounded" width={120} height={40} />
        <Skeleton variant="rounded" width={120} height={40} />
      </Stack>
    </Container>
  );
}
