import type { Metadata } from 'next';
import { ProfessionalLoginForm } from '@/components/auth/ProfessionalLoginForm';

export const metadata: Metadata = {
  title: 'Entrar — LashAgenda',
};

export default function EntrarPage() {
  return <ProfessionalLoginForm />;
}
