<!-- src/lib/ThemeProvider.svelte -->
<script>
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  
  // Define route-theme mappings
  const routeThemeMap = {
    '/': 'theme-default',
    '/new': 'theme-otr-light',
   
    // Add more routes as needed
  };
  
  // Default theme to use when no specific route match is found
  const defaultTheme = 'theme-default';
  
  // Active theme state using runes
  let activeTheme = $state(defaultTheme);
  
  // Effect to update theme when the route changes
  $effect(() => {
    // Get the current path
    const path = page.url.pathname;
    
    // Find the most specific matching route
    // This allows nested routes to inherit themes from parent routes if not specified
    const matchingRoutes = Object.keys(routeThemeMap)
      .filter(route => path.startsWith(route))
      .sort((a, b) => b.length - a.length); // Sort by specificity (longest path first)
    
    // Set the theme for the most specific matching route, or use default
    activeTheme = matchingRoutes.length > 0 
      ? routeThemeMap[matchingRoutes[0]] 
      : defaultTheme;
    
    // Apply the theme if component is mounted
    if (typeof document !== 'undefined') {
      updateBodyTheme(activeTheme);
    }
  });
  
  // Function to update the body class
  function updateBodyTheme(theme) {
    // Remove all theme classes
    Object.values(routeThemeMap).forEach(themeClass => {
      document.body.classList.remove(themeClass);
    });
    
    // Add the active theme class
    document.body.classList.add(theme);
  }
  
  // Initialize on mount
  onMount(() => {
    if (activeTheme) {
      updateBodyTheme(activeTheme);
    }
  });
</script>

<slot />