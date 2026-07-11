'use strict';

import { signIn } from '@/lib/auth';

export async function loginAction(formData: FormData) {
  'use server';

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    await signIn('credentials', {
      email,
      password: password || '',
      redirectTo: email === 'susi@landlord.com' ? '/admin' : '/portal',
    });
  } catch (error) {
    throw error;
  }
}
