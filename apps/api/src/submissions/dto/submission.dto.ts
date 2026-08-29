import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSubmissionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  branchKey?: string;
}

export class UpdateSubmissionBranchDto {
  @IsString()
  @MinLength(1)
  branchKey!: string;
}

export class SaveStepAnswerDto {
  @IsString()
  @MinLength(1)
  value!: string;
}
