'use client';

import {
  Box,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
} from '@mui/material';

export function DashboardSkeleton() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Skeleton variant="text" width={180} height={44} />
        <Skeleton variant="rounded" width={160} height={40} />
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[0, 1, 2].map((index) => (
          <Grid key={index} size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="30%" height={48} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Skeleton variant="text" width={140} height={36} sx={{ mb: 2 }} />
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[0, 1].map((index) => (
          <Grid key={index} size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="50%" height={32} />
                <Skeleton variant="text" width="70%" height={20} sx={{ my: 1 }} />
                <Stack direction="row" spacing={1}>
                  <Skeleton variant="rounded" width={72} height={32} />
                  <Skeleton variant="rounded" width={110} height={32} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Skeleton variant="text" width={200} height={36} sx={{ mb: 2 }} />
      {[0, 1, 2].map((index) => (
        <Card key={index} sx={{ mb: 1 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Skeleton variant="text" width="35%" height={28} />
            <Skeleton variant="text" width="55%" height={18} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export function WorkflowEditorSkeleton() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Skeleton variant="text" width={260} height={44} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={110} height={40} />
          <Skeleton variant="rounded" width={100} height={40} />
          <Skeleton variant="rounded" width={90} height={40} />
        </Stack>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} variant="rounded" width={100} height={36} />
        ))}
      </Stack>

      <Card>
        <CardContent>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton
              key={index}
              variant="rounded"
              height={56}
              sx={{ mb: index < 3 ? 2 : 0 }}
            />
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}

export function SubmissionDetailSkeleton() {
  return (
    <Box>
      <Skeleton variant="rounded" width={200} height={36} sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width={180} height={44} />
          <Skeleton variant="text" width={320} height={24} />
        </Box>
        <Skeleton variant="rounded" width={100} height={32} />
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Skeleton variant="text" width={80} height={20} />
          <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="50%" height={20} sx={{ mt: 1 }} />
        </CardContent>
      </Card>

      <Skeleton variant="text" width={100} height={36} sx={{ mb: 2 }} />
      {[0, 1, 2].map((index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Skeleton variant="text" width="30%" height={28} />
            <Skeleton variant="rounded" height={64} sx={{ mt: 1 }} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export function TemplatesPageSkeleton() {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        {[0, 1, 2].map((index) => (
          <Card key={index} sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="text" width="70%" height={32} />
              <Skeleton variant="text" width="100%" height={20} />
              <Skeleton variant="text" width="40%" height={18} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        ))}
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardContent>
            <Skeleton variant="text" width="50%" height={36} sx={{ mb: 2 }} />
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} variant="rounded" width={100} height={32} />
              ))}
            </Stack>
            <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" height={48} />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export function WorkflowVersionDetailSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} variant="text" width={`${90 - index * 10}%`} height={22} sx={{ mb: 1 }} />
      ))}
    </Box>
  );
}

export function WorkflowVersionHistorySkeleton() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 2 }}>
      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          {[0, 1, 2, 3].map((index) => (
            <Box key={index} sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Skeleton variant="text" width="30%" height={24} />
              <Skeleton variant="text" width="80%" height={18} />
            </Box>
          ))}
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
          {[0, 1, 2, 4].map((index) => (
            <Skeleton key={index} variant="text" width={`${90 - index * 10}%`} height={22} sx={{ mb: 1 }} />
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
