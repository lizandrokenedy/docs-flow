import { Box, Container, Typography } from '@mui/material';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom fontWeight={700} color="primary">
          Docs Flow
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Envie seus documentos de forma simples, passo a passo.
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Acesse o link do workflow fornecido para iniciar o envio dos seus documentos.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          Demo:{' '}
          <Link href="/w/abertura-conta" style={{ color: '#1565C0' }}>
            /w/abertura-conta
          </Link>
        </Typography>
      </Box>
    </Container>
  );
}
