<script>
    import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
</script>


<div class="main">
 
<!-- 아이템 추가 버튼 영역 -->
<section id="add-item-section">

    <button id="add-item-btn"><Icon class="btn-icon-st" icon="typcn:plus" width="24" height="24" /></button>

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
        margin-bottom: 32px ;
        
    }

    section{
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

</style>