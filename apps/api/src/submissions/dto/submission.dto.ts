import { IsString } from 'class-validator';

export class CreateSubmissionDto {}

export class SaveStepAnswerDto {
  @IsString()
  value!: string;
}
