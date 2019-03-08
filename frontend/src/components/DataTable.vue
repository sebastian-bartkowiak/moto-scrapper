<template>
    <table id="table_id" class="display">
        <thead>
            <tr>
                <th>LP</th>
                <th>Nazwa</th>
                <th>Lokalizacja</th>
                <th>Cena</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>
</template>
<script>
export default {
    name: 'DataTable',
    mounted(){
        $('#table_id').DataTable({
            serverSide: true,
            ajax: {
                url: "http://localhost:8080/ads"
            },
            columns: [
                { data: "id" },
                { data: "title" },
                { data: "locationName" },
                { data: "sources[0].entries[0].price" }
            ]
        });
    }
}
</script>
