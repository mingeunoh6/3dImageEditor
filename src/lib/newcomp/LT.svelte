<script>
    import { onMount } from 'svelte';
    import Icon from '@iconify/svelte';
</script>


<div class="main">
    <button class="main-btn"><Icon class="LT-btn" icon="foundation:list"  /></button>
        <button class="main-btn"><Icon class="LT-btn"  icon="ph:sphere-fill" /></button>

  <button class="main-btn"><Icon class="LT-btn" icon="heroicons-solid:light-bulb" /></button>
      <button class="main-btn"><Icon class="LT-btn" icon="fa:video-camera"  /></button>

</div>


<style>
       div :global(.LT-btn) {
height: 100%;
width: 100%;
    }

       .main{
        box-sizing: border-box;
display: flex;
flex-direction: column;
justify-content: center;
align-items: center;

        position: absolute;
     margin: 24px 24px;
     z-index: 999;

    }

    .main-btn{
        width: 64px;
        height: 42px;
        background-color: #18272E;
        border: none;
        color: #F0F0F0;
        text-align: center;
        text-decoration: none;
        display:flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        font-size: 16px;
        margin: 4px 2px;
        cursor: pointer;
        border-radius: 50px;
        padding: 10px 20px;
    }

    .main-btn:hover{
        background-color: #EE5F5F;
    
    }

 

    </style>