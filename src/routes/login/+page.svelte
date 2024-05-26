<script>
    import * as devalue from 'devalue';
    import { Identity } from "@semaphore-protocol/identity"
    import { Group } from "@semaphore-protocol/group"
    import { id, groups } from "$lib/stores"

    let hasID
    $: hasID = $id.length > 4 

    let hasGroups
    $: hasGroups = $groups.length > 0

    let groupname

    function clear() {
        //$id = devalue.stringify({})
        $id = devalue.stringify({})
    }
    function create() {
        console.log('create')
        const {commitment, nullifier, secret, trapdoor} = new Identity()
        console.log({commitment, nullifier, secret, trapdoor} )
        $id = devalue.stringify({commitment, nullifier, secret, trapdoor} )
    }
    function createGroup() {
        //console.log(groupname, $id, devalue.parse($id))
        const group = new Group([devalue.parse($id).commitment])
        $groups.push(group)
        $groups = $groups
        //console.log($groups)
    }
    function login() {
        //localStorage.get('id')
        console.log(devalue.parse($id))
    }
</script>

<div class="container">
    <dialog open class="modal">
        <article>
            <header>
                <h2>Login</h2>
            </header>
            {hasID}
            {$id.length}
            {#if hasID}
                <p>Hello {devalue.parse($id).nullifier} 

                <div class="clear" on:click={() => clear()}>clear</div>
                <h4>Your groups</h4>
                {#if hasGroups}
                    {#each groups as gr }
                      {gr}
                    {/each}
                {/if}
                <input name="groupname" bind:value={groupname} placeholder="The Spice Girls"  type="">
                <button on:click={() => createGroup()}>New Group</button>

            {:else}
                <button on:click={() => create()}>Create your key</button>
            {/if}

            

            <form method="POST">
                <input name="ID" bind:value={$id} type="hidden">
                <button on:click={() => login()}>Login</button>
            </form>
        </article>
    </dialog>
</div>

<style>
.clear {font-size: 80%; text-decoration: underline; color: red;}
</style>
