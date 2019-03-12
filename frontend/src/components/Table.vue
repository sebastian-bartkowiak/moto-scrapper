<template>
    <div>
        <ul class="paginator">
            <li :class="{disabled:isFirst}" v-on:click="!isFirst?(offset = 0):null">Pierwsza</li>
            <li :class="{disabled:isFirst}" v-on:click="!isFirst?(offset -= pageSize):null">Poprzednia</li>
            <li :class="{disabled:isLast}" v-on:click="!isLast?(offset += pageSize):null">Następna</li>
            <li :class="{disabled:isLast}" v-on:click="!isLast?(offset = Math.floor(dataCount/pageSize)*pageSize):null">Ostatnia</li>
        </ul>
        <table>
            <thead>
                <tr>
                    <th v-on:click="order('id')" :class="{sort_asc:(sort.col=='id' && sort.dir=='ASC'), sort_desc:(sort.col=='id' && sort.dir=='DESC')}">ID</th>
                    <th v-on:click="order('title')" :class="{sort_asc:(sort.col=='title' && sort.dir=='ASC'), sort_desc:(sort.col=='title' && sort.dir=='DESC')}">Nazwa</th>
                    <th v-on:click="order('locationName')" :class="{sort_asc:(sort.col=='locationName' && sort.dir=='ASC'), sort_desc:(sort.col=='locationName' && sort.dir=='DESC')}">Lokalizacja</th>
                    <th v-on:click="order('price')" :class="{sort_asc:(sort.col=='price' && sort.dir=='ASC'), sort_desc:(sort.col=='price' && sort.dir=='DESC')}">Cena</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="ad in currentData" :key="ad.id">
                    <td>{{ ad.id }}</td>
                    <td><a :href="ad.sources[0].url">{{ ad.title }}</a></td>
                    <td>{{ ad.locationName }}</td>
                    <td>4</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
<script>
import axios from 'axios';

export default {
    name: 'Table',
    methods:{
        async updateData(){
            let ads = await axios.get("http://localhost:8080/ads", {
                params: {
                    pageSize:   this.pageSize,
                    offset:     this.offset,
                    order_col:  this.sort.col,
                    order_dir:  this.sort.dir
                }
            });
            this.currentData = ads.data.data;
            this.dataCount = ads.data.count;
        },
        order:function(col){
            if(this.sort.col == col){
                this.sort.dir = this.sort.dir=='ASC'?'DESC':'ASC';
                return;
            }
            this.sort.col = col;
            this.sort.dir = 'ASC';
        }
    },
    mounted(){
        this.updateData();
    },
    watch:{
        offset:function(){
            this.updateData();
        },
        sort:{
            handler(){
                this.updateData();
            },
            deep:true
        }
    },
    computed:{
        isFirst(){
            return this.offset === 0;
        },
        isLast(){
            return (this.offset + this.pageSize) >= this.dataCount;
        }
    },
    data(){
        return {
            pageSize:       50,
            offset:         0,
            currentData:    [4,2,3],
            dataCount:      0,
            sort:{
                col: "id",
                dir: "ASC"
            }
        }
    }
}
</script>
