<script>
    // Toggle button props with defaults
    let {
        checked = false,
        label = "",
        disabled = false,
        onToggle = undefined,
        labelPosition = "left" // 'left' or 'right'
    } = $props();

    // Handle the toggle change
    function handleChange(event) {
        // Stop event propagation to prevent parent clicks
        event.stopPropagation();
        
        // Only process if not disabled
        if (!disabled) {
            // Update the checked value
            checked = event.target.checked;
            
            // Call the parent callback if provided
            if (onToggle) {
                onToggle(event);
            }
        }
    }

    // Prevent click propagation
    function onClick(e) {
        e.stopPropagation();
    }
</script>

<div class="toggle-btn-container" class:disabled={disabled} onclick={onClick}>
    {#if label && labelPosition === "left"}
        <label for="toggle-input" class="toggle-label">{label}</label>
    {/if}
    
    <div class="toggle-container">
        <label class="toggle">
            <input
                type="checkbox"
                id="toggle-input"
                checked={checked}
                {disabled}
                onchange={handleChange}
                onclick={onClick}
            />
            <span class="slider"></span>
        </label>
    </div>
    
    {#if label && labelPosition === "right"}
        <label for="toggle-input" class="toggle-label">{label}</label>
    {/if}
</div>

<style>
    .toggle-btn-container {
        display: flex;
        align-items: center;
        cursor: default;
    }
    
    .toggle-btn-container.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .toggle-container {
        padding: 10px;
        display: flex;
        align-items: center;
    }
    
    .toggle {
        position: relative;
        display: inline-block;
        width: 40px;
        height: 22px;
    }
    
    .toggle input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--dim-color);
        transition: 0.4s;
        border-radius: 34px;
    }
    
    .slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
    }
    
    input:checked + .slider {
        background-color: var(--highlight-color);
    }
    
    input:focus + .slider {
        box-shadow: 0 0 1px var(--highlight-color);
    }
    
    input:checked + .slider:before {
        transform: translateX(18px);
    }
    
    .toggle-label {
        text-align: left;
        font-size: 0.9rem;
        color: var(--text-color-standard);
        cursor: pointer;
        margin: 0 10px;
        transition: all ease-in-out 300ms;
    }
    
    .toggle-label:hover {
        color: var(--text-color-bright);
    }
</style>