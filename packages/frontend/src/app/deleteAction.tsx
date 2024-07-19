'use server'

import { revalidatePath } from "next/cache"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"


export async function deleteEvent(eventId: string) {



    console.log("hello");



    revalidatePath("/")
}