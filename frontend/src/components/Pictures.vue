<template>
    <div>
        <img class="table-img" v-on:click="large=true" :src="picArray[0].url">
        <div :class="{modal:large,hidden:!large}">
            <span v-on:click="large=false" class="close button"></span>
            <span v-on:click="prevPic" class="prev button" :class="{hidden:picArray.length==1}"></span>
            <span v-on:click="nextPic" class="next button" :class="{hidden:picArray.length==1}"></span>
            <img class="middle" :src="bigPic">
        </div>
    </div>
</template>
<script>
export default {
    name: 'Pictures',
    props: ['picArray'],
    watch:{
        large: function(){
            if(this.large){
                document.documentElement.style.overflow = 'hidden';
                this.bigPicId = 0;
            }
            else{
                document.documentElement.style.overflow = 'auto';
            }
        },
        bigPicId: function(){
            this.bigPic = this.picArray[this.bigPicId].url;
        }
    },
    methods:{
        prevPic: function(){
            if((this.bigPicId-1)<0)
                this.bigPicId = this.picArray.length - 1;
            else
                this.bigPicId -= 1;
        },
        nextPic: function(){
            if((this.bigPicId+1)>(this.picArray.length - 1))
                this.bigPicId = 0;
            else
                this.bigPicId += 1;
        }
    },
    data(){
        return {
            large: false,
            bigPic: undefined,
            bigPicId: undefined
        }
    }
}
</script>
<style>
.hidden {
    display: none;
}

.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.75);;
}

.modal .button {
    position: absolute;
    width: 30px;
    height: 30px;
    background: white;
    border-radius: 5px;
}

.modal .close {
    top: 0;
    right: 0;
    margin-top: 20px;
    margin-right: 20px;
}

.modal .prev {
    top: 50%;
    left: 0;
    margin-left: 20px;
}

.modal .next {
    top: 50%;
    right: 0;
    margin-right: 20px;
}

img.middle  {
    margin: auto;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    min-width: 50vw;
    min-height: 50vh;
    max-width: 80vw;
    max-height: 80vh;
    object-fit: contain;
}
</style>