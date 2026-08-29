'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import type { QuestionOption } from '@docs-flow/types';
import { slugifyOptionId } from '@docs-flow/types';

interface QuestionOptionsEditorProps {
  options: QuestionOption[];
  onChange: (options: QuestionOption[]) => void;
  disabled?: boolean;
}

export function QuestionOptionsEditor({
  options,
  onChange,
  disabled,
}: QuestionOptionsEditorProps) {
  const updateOption = (index: number, label: string) => {
    const next = [...options];
    next[index] = { ...next[index], label };
    onChange(next);
  };

  const addOption = () => {
    const label = `Opção ${options.length + 1}`;
    onChange([...options, { id: slugifyOptionId(label, options.length), label }]);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Opções da pergunta
      </Typography>
      <Stack spacing={2.5} sx={{ mt: 1.5 }}>
        {options.map((option, index) => (
          <Stack key={option.id} direction="row" spacing={1} alignItems="flex-start">
            <TextField
              fullWidth
              size="small"
              label={`Opção ${index + 1}`}
              value={option.label}
              disabled={disabled}
              onChange={(event) => updateOption(index, event.target.value)}
              sx={{ mt: 0.5 }}
            />
            <IconButton
              size="small"
              color="error"
              disabled={disabled || options.length <= 2}
              onClick={() => removeOption(index)}
              aria-label={`Remover opção ${index + 1}`}
              sx={{ mt: 0.75 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button
        startIcon={<AddIcon />}
        size="small"
        sx={{ mt: 2.5 }}
        disabled={disabled}
        onClick={addOption}
      >
        Adicionar opção
      </Button>
    </Box>
  );
}
