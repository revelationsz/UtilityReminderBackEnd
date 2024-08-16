import mongoose from 'mongoose';

const currEmail = new mongoose.Schema({
    usersID: String,
    electric: String,
    gas: String,
    currentGasPayment: String,
    curentElectricPayment: String,
    gasDate: String,
    electricDate: String,
    gasBillPaymentStatus: String,
    electricBillPaymentStatus: String,
    gasBillRequestStatus: String,
    electricBillRequestStatus: String
})

const currInfo = mongoose.model("currEmail", currEmail)

export {currInfo}