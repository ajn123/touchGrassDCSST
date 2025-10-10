import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

export async function GET(request: NextRequest) {
  fetch(Resource.Api.url + "/events/sync")
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.error(error);
    });
  return NextResponse.json({ message: "Hello, world!" });
}
