export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

export function getPublicWorkflowUrl(slug: string) {
  return `${WEB_URL}/w/${slug}`;
}

export function getUploadUrl(submissionId: string, stepId: string, storedName: string) {
  return `${API_URL}/uploads/${submissionId}/${stepId}/${storedName}`;
}
