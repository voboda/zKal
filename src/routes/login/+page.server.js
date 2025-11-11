import { redirect } from "@sveltejs/kit";
import { id } from "$lib/stores";
import * as devalue from "devalue";

export const actions = {
  default: async ({ cookies, request }) => {
    const formdata = await request.formData();
    //db.createTodo(cookies.get('userid'), data.get('description'));
    console.log("fdata", formdata);
    const data = devalue.parse(formdata.get("ID"));
    console.log("data", data);
    if (data.nullifier > 0) {
      console.log("pass");
      redirect(303, "/");
    } else {
      console.log("boo");
      //throw redirect(307, '/login');
    }
  },
};
