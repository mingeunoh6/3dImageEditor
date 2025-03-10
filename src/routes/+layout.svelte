<script>
	import { dev } from '$app/environment';
	import { inject } from '@vercel/analytics';
	  import ThemeProvider from '$lib/ThemeProvider.svelte';


	inject({ mode: dev ? 'development' : 'production' });
</script>

<ThemeProvider>
  <slot />
</ThemeProvider>