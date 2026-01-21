import { redirect } from 'next/navigation';

type LoginSearchParams = Record<string, string | string[] | undefined>;

export default function LoginPage({
  searchParams,
}: {
  searchParams?: LoginSearchParams;
}) {
  const params = new URLSearchParams();

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === 'string') {
        params.set(key, value);
      }
    }
  }

  const query = params.toString();
  redirect(query ? `/create?${query}` : '/create');
}
