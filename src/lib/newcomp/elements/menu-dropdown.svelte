<script>
    // Dropdown props with defaults
    let {
        label = "",
        placeholder = "Select an option",
        options = [],
        selected = null,
        disabled = false,
        onChange = undefined,
        width = "250px",
        maxHeight = "200px",
        labelPosition = "top", // 'top' or 'left'
        dropDirection = "top"
    } = $props();

    // Local state for the dropdown with Svelte 5 reactivity
    let isOpen = $state(false);
    let activeIndex = $state(-1);
    
    // Handle dropdown toggle
    function toggleDropdown(event) {
        // Stop event propagation to prevent parent clicks
        event.stopPropagation();
        
        // Only toggle if not disabled
        if (!disabled) {
            isOpen = !isOpen;
            console.log('Dropdown toggled:', isOpen);
            
            // Reset active index when opening
            if (isOpen) {
                activeIndex = -1;
            }
        }
    }
    
    // Handle option selection
    function selectOption(option, index, event) {
        // Stop event propagation
        event.stopPropagation();
        
        // Only process if not disabled
        if (!disabled) {
            selected = option.value;
            isOpen = false;
            
            // Call the parent callback if provided
            if (onChange) {
                onChange(option, event);
            }
        }
    }
    
    // Outside click handler to close dropdown
    function handleClickOutside(event) {
        // Only close if the click is outside of our dropdown container
        if (isOpen && !event.target.closest('.dropdown-container')) {
            isOpen = false;
        }
    }
    
    // Keyboard navigation
    function handleKeyDown(event) {
        if (disabled) return;
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (!isOpen) {
                    isOpen = true;
                } else {
                    activeIndex = Math.min(activeIndex + 1, options.length - 1);
                }
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                if (isOpen) {
                    activeIndex = Math.max(activeIndex - 1, 0);
                }
                break;
                
            case 'Enter':
                event.preventDefault();
                if (isOpen && activeIndex >= 0) {
                    selectOption(options[activeIndex], activeIndex, event);
                } else if (!isOpen) {
                    isOpen = true;
                }
                break;
                
            case 'Escape':
                event.preventDefault();
                if (isOpen) {
                    isOpen = false;
                }
                break;
        }
    }
    
    // Get the display value
    function getDisplayValue() {
        if (selected === null) return placeholder;
        
        const selectedOption = options.find(opt => opt.value === selected);
        return selectedOption ? selectedOption.label : placeholder;
    }
    
    // Handle mouseenter for item hover
    function handleMouseEnter(index) {
        activeIndex = index;
    }
</script>

<div class="dropdown-container" class:left-label={labelPosition === "left"} style:--dropdown-width={width}>
    {#if label && labelPosition === "top"}
        <label class="dropdown-label">{label}</label>
    {/if}
    
    <div class="dropdown-wrapper">
        {#if label && labelPosition === "left"}
            <label class="dropdown-label">{label}</label>
        {/if}
        
        <div 
            class="dropdown" 
            class:disabled={disabled} 
            class:active={isOpen}
            class:open={isOpen}
            onclick={toggleDropdown}
            onkeydown={handleKeyDown}
            tabindex={disabled ? -1 : 0}
        >
            <div class="selected-value">
                {getDisplayValue()}
            </div>
            <div  class={dropDirection==="top"?"dropdown-arrow":"dropdown-arrow-top"}>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        </div>
        
        {#if isOpen}
            <div class={dropDirection==="top"?"dropdown-menu":"dropdown-menu-top"} style:--max-height={maxHeight}>
                {#each options as option, index}
                    <div 
                        class="dropdown-item" 
                        class:active={activeIndex === index}
                        class:selected={selected === option.value}
                        onclick={(e) => selectOption(option, index, e)}
                        onmouseenter={() => handleMouseEnter(index)}
                    >
                        {option.label}
                    </div>
                {/each}
                
                {#if options.length === 0}
                    <div class="dropdown-empty">No options available</div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<svelte:window onclick={handleClickOutside} />

<style>
    .dropdown-container {
        position: relative;
        display: flex;
        flex-direction: column;
        width: var(--dropdown-width, 250px);
    }
    
    .dropdown-container.left-label {
        flex-direction: row;
        align-items: center;
    }
    
    .dropdown-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
      
        
    }
    
    .dropdown-label {
        font-size: 0.9rem;
        color: var(--text-color-standard);
        margin-bottom: 5px;
        margin-right: 10px;
    }
    
    .dropdown-container.left-label .dropdown-label {
        margin-bottom: 0;
    }
    
    .dropdown {
        box-sizing: border-box;
        position: relative;
        width: 100%;
        height: 38px;
        background-color: var(--primary-color);
     
       
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        transition: all 0.2s ease;
        user-select: none;
    }
    
    .dropdown:focus {
 
        outline: none;
       
    }
    
    .dropdown.active {
       
    }
    
    .dropdown.open {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }
    
    .dropdown.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: var(--dim-color, #1a2025);
    }
    
    .selected-value {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text-color-standard, #e0e0e0);
    }
    
    .dropdown-arrow {
        margin-left: 10px;
        display: flex;
        align-items: center;

        color: var(--text-color-dim, #909090);
        transition: transform 0.2s ease;
    }
    
    .dropdown.active .dropdown-arrow {
        transform: rotate(180deg);
    }

        .dropdown-arrow-top {
        margin-left: 10px;
        display: flex;
   
        align-items: center;
        color: var(--text-color-dim, #909090);
        transition: transform 0.2s ease;
    }
    
    .dropdown-arrow-top.active .dropdown-arrow-top {
        transform: rotate(-180deg);
    }
    
    .dropdown-menu {
        position: absolute;
        bottom: 100%;
        left: 0;
        width: var(--dropdown-width, 250px);
        max-height: 200px;
        overflow-y: auto;
        background-color: var(--bg-color-light, #2a3035);
      
        border-radius: 6px 6px 0 0 ;
   box-sizing: border-box;
        z-index: 999;
        margin-top: 0;
     
    }

      .dropdown-menu-top {
        position: absolute;
        top: 100%;
        left: 0;
        width: var(--dropdown-width, 250px);
        max-height: 200px;
        overflow-y: auto;
        background-color: var(--bg-color-light, #2a3035);
      
        border-radius:0 0  6px 6px ;
   box-sizing: border-box;
        z-index: 999;
        margin-top: 0;
     
    }
    
    .dropdown-item {
        font-size: 0.8rem;
        padding: 8px 12px;
        min-height: 20px;
        display: flex;
        align-items: center;
        cursor: pointer;
        color: var(--text-color-standard);
        transition: background-color 0.2s ease;
            background-color: var(--primary-color);
            border: 1px solid var(--dim-color);
    }

    .dropdown-item:first-child{
        border-top-right-radius: 6px;
        border-top-left-radius:  6px;
    }
    
    .dropdown-item:hover, 
    .dropdown-item.active {
        background-color: var(--highlight-color);
    }
    
    .dropdown-item.selected {
        color: var(--text-color-bright);
            background-color: var(--highlight-color);
        font-weight: 500;
    }
    
    .dropdown-empty {
        padding: 12px;
        text-align: center;
        color: var(--text-color-dim, #909090);
        font-style: italic;
    }

    .dropdown-menu-top .dropdown-item:first-child{
         border-top-right-radius: 0px;
        border-top-left-radius:  0px;
    }

      .dropdown-menu-top .dropdown-item:last-child{
         border-bottom-right-radius: 6px;
        border-bottom-left-radius:  6px;
    }
    
    
    /* Scrollbar styling */
    .dropdown-menu::-webkit-scrollbar {
        width: 6px;
    }
    
    .dropdown-menu::-webkit-scrollbar-track {
        background: transparent;
    }
    
    .dropdown-menu::-webkit-scrollbar-thumb {
        background-color: var(--dim-color, #1a2025);
        border-radius: 6px;
    }
</style>