<template>
    <div>
        <img class="table-img" v-on:click="large=true" :src="picArray[0].url">
        <div v-if="large" class="modal" v-on:keyup.left="prevPic" v-on:keyup.right="nextPic">
            <span v-on:click="large=false" class="close button"><i class="fa fa-2x fa-times" aria-hidden="true"></i></span>
            <span v-on:click="prevPic" class="prev button" :class="{hidden:picArray.length==1}"><i class="fa fa-2x fa-chevron-left" aria-hidden="true"></i></span>
            <span v-on:click="nextPic" class="next button" :class="{hidden:picArray.length==1}"><i class="fa fa-2x fa-chevron-right" aria-hidden="true"></i></span>
            <div class="title-outer">
                <span class="title">{{ title }}</span>
            </div>
            <img class="middle" :src="bigPic">
            <div class="pics-list-outer">
                <div class="pics-list">
                    <img v-for="pic in smallPics" :key="pic" :src="picArray[pic].url" v-on:click="bigPicId=pic" :class="{'current-pic':bigPicId==pic}"/>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    name: 'Pictures',
    props: ['picArray','title'],
    watch:{
        large: function(){
            if(this.large){
                document.documentElement.style.overflow = 'hidden';
                this.bigPicId = 0;
                for(var pic in this.picArray){
                    this.smallPics.push(pic);
                }
                window.addEventListener('keyup', this.keyboard);
            }
            else{
                document.documentElement.style.overflow = 'auto';
                window.removeEventListener('keyup', this.keyboard);
            }
        },
        bigPicId: function(){
            this.bigPic = this.picArray[this.bigPicId].url;
        }
    },
    methods:{
        keyboard: function(e){
            if(e.key == "ArrowLeft")
                this.prevPic();
            if(e.key == "ArrowRight")
                this.nextPic();
            if(e.key == "Escape")
                this.large = false;
        },
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
            bigPicId: undefined,
            smallPics: []
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
    width: 40px;
    height: 40px;
    background: white;
    border-radius: 5px;
    cursor: pointer;
    text-align: center;
}

.modal .button i {
    padding-top: 4px;
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

.title-outer {
    position: absolute;
    top: 10px;
    left: 50%;
}

.title {
    position: relative;
    left: -50%;
    color: white;
    font-size: 1.5em;
    white-space: nowrap;
}

img.middle {
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
    user-select: none;
}

.pics-list-outer {
    position: absolute;
    bottom: 5px;
    left: 50%;
}

.pics-list {
    position: relative;
    left: -50%;
    white-space: nowrap;
}

.pics-list img {
    max-width: 100px;
    max-height: 100px;
    object-fit: contain;
    border: 1px solid white;
    margin: 0 10px 0 10px;
    vertical-align: middle;
    cursor: pointer;
    transform: none;
    transition: transform 1s;
}

.pics-list .current-pic {
    transform: scale(1.8) translateY(-10px);
}
</style>