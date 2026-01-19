import { redirect } from '@sveltejs/kit';

export const actions = {
  default: async () => {
    // This action is no longer needed since we're not using cookies
    // Just redirect to home
    throw redirect(303, '/');
  },
};
