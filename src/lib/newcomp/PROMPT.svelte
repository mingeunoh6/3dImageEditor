<!-- PROMPT.svelte -->

<script>
    import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
import { slide } from 'svelte/transition';


 
let {add3dModel}  = $props();

    let addMenuOpen = $state(false);
    function toggleAddMenu(){
        addMenuOpen = !addMenuOpen;
   
    }

    function addModel(event){
        console.log('add model');
        const file = event.target.files[0];
        if (file){
    add3dModel(file);
        }
    
    }
</script>


<div class="main">
 
<!-- 아이템 추가 버튼 영역 -->
<section id="add-item-section">
    	<input
						type="file"
						id="glb-import"
						accept=".glb,.gltf"
						style="display: none;"
						oninput={addModel}
					/>

    <button id="add-item-btn" onclick={toggleAddMenu}><Icon class="btn-icon-st" icon="typcn:plus" width="24" height="24" /></button>
{#if addMenuOpen}
    <div class="add-item-list" transition:slide>
    <button onclick={() => document.getElementById('glb-import').click()} id="add-model-btn">3D Model</button>
    <button id="add-image-btn">3D Wall</button>

    </div>
{/if}
</section>


<!-- 프롬프트 입력 영역 -->
<section id="prompt-section">                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
    <input type="text" id="prompt-input" placeholder="입력하세요" />


    <!-- 토글 옵션 -->
      <div class="toggle-container">
     
        <label class="toggle">
            <input type="checkbox" id="toggleButton">
            <span class="slider"></span>
        </label>
     
    </div>

</section>


<!-- 렌더링 버튼 영역 -->
<section>

    <button id="render-btn"><Icon icon="mingcute:ai-fill" width="24" height="24" />RENDER</button>

  

</section>


</div>


<style>

       div :global(.btn-icon-st) {
height: 100%;

   }

    .main{
        box-sizing: border-box;

        position: absolute;
    

        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
                min-width: 100px;
             width: 100%;
        max-width: 800px;

       
gap: 10px;
        left: 50%;
        bottom: 0;
        transform: translateX(-50%);
        height:48px;
        padding-left: 20px;
        padding-right: 20px;
        margin-bottom: 32px ;
        z-index: 999;
    }

    section{
         position: relative;
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        height: 100%;
  
    }

    button{
          box-sizing: border-box;
          padding: 10px 20px;
        background-color: #18272E;
        color: white;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        display: flex;  
        justify-content: center;
        align-items: center;
        height: 100%;
    }


    button:hover{
           background-color: #1A1A1A;
    color: white;
    }
  #prompt-section{
          box-sizing: border-box;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 10px;
             min-width: 200px;
             width: 100%;
        max-width: 800px;
    }
    #prompt-input{
          box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: center;
     padding: 10px 20px;
         border: none;
        border-radius: 50px;
   color:#F0F0F0 ;
   width: 100%;
        height: 100%;
          background-color: #18272E;
    }

  

    #render-btn{
          box-sizing: border-box;
        padding: 10px 20px;
        background-color: #18272E;
        color: white;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        display: flex;  
        justify-content: center;
        align-items: center;
        gap: 6px;
    }


      .toggle-container {
      box-sizing: border-box;
        }

        .toggle-label {
            margin-bottom: 10px;
            font-size: 18px;
            color: #333;
        }

        .toggle {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
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
            background-color: #ccc;
            transition: .4s;
            border-radius: 34px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 26px;
            width: 26px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        input:checked + .slider {
            background-color: #18272E;
        }

        input:focus + .slider {
            box-shadow: 0 0 1px #18272E;
        }

        input:checked + .slider:before {
            transform: translateX(26px);
        }

        .status {
            margin-top: 20px;
            font-size: 16px;
            color: #555;
        }



        #add-item-section{
            position: relative;
            display: flex;
            flex-direction: row;
            justify-content: flex-start;
            
        }

  .add-item-list {
    position: absolute;
    bottom: 100%;
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: 3px;

    overflow: hidden;
    transition: all ease-in-out 0.5s;
    min-width: 120px; /* Set a minimum width */
}
.add-item-list button {
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    padding: 15px 20px;
    gap: 6px;
    width: 100%; /* Make button full width of container */
    white-space: nowrap; /* Prevent text wrapping */
}

.add-item-list button:hover {
    background-color: #1A1A1A;
    color: white;
}
</style>