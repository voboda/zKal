<script>
    import { PUBLIC_CALENDAR_URLS } from '$env/static/public';

    let calendars = PUBLIC_CALENDAR_URLS;
</script>

<style>
    .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 1em;
    }
    .calendar {
        display: flex;
        align-items: center;
        gap: 0.5em;
    }
    .color-box {
        width: 1em;
        height: 1em;
    }
</style>

<div class="legend">
    {#each calendars as calendar}
        <div class="calendar">
            <div class="color-box" style="background-color: {calendar.color};"></div>
            <span>{calendar.name}</span>
        </div>
    {/each}
</div>
