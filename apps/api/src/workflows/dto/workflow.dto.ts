import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateWorkflowDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug inválido' })
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsString()
  templateCategory?: string;
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug inválido' })
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsString()
  templateCategory?: string;
}

export class CreateWorkflowStepDto {
  @Matches(UUID_LIKE_REGEX, { message: 'documentTypeId must be a UUID' })
  documentTypeId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL de exemplo inválida' })
  exampleUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsIn(['DOCUMENT', 'CHOICE'])
  stepKind?: 'DOCUMENT' | 'CHOICE';

  @IsOptional()
  @IsString()
  branchKey?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Matches(UUID_LIKE_REGEX, { message: 'conditionStepId must be a UUID' })
  conditionStepId?: string;

  @IsOptional()
  @IsString()
  conditionValue?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  choiceOptions?: string[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxFiles?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedExtensionsOverride?: string[];
}

export class UpdateWorkflowStepDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Matches(UUID_LIKE_REGEX, { message: 'documentTypeId must be a UUID' })
  documentTypeId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL de exemplo inválida' })
  exampleUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsIn(['DOCUMENT', 'CHOICE'])
  stepKind?: 'DOCUMENT' | 'CHOICE';

  @IsOptional()
  @IsString()
  branchKey?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @Matches(UUID_LIKE_REGEX, { message: 'conditionStepId must be a UUID' })
  conditionStepId?: string | null;

  @IsOptional()
  @IsString()
  conditionValue?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  choiceOptions?: string[];

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxFiles?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedExtensionsOverride?: string[];
}

class ReorderStepItemDto {
  @Matches(UUID_LIKE_REGEX, { message: 'id must be a UUID' })
  id!: string;

  @IsInt()
  @Min(0)
  position!: number;
}

export class ReorderStepsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderStepItemDto)
  steps!: ReorderStepItemDto[];
}

export class DuplicateWorkflowDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug inválido' })
  slug?: string;
}
