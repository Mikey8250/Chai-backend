import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber : {
        type: Schema.Types.ObjectId, // One who is subscribing
        reference: "User"
    },
    channel: {
        type: Schema.Types.ObjectId, // one to whom 'subscriber' is subscribing
        reference: "User"
    }
})

export const Subscrption = mongoose.model("Subscription", subscriptionSchema)