import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDocumentTypeDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  allowedExtensions!: string[];

  @IsArray()
  @IsString({ each: true })
  allowedMimeTypes!: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSizeBytes!: number;

  @IsOptional()
  @IsString()
  icon?: string;
}

export class UpdateDocumentTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedExtensions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedMimeTypes?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSizeBytes?: number;

  @IsOptional()
  @IsString()
  icon?: string;
}
