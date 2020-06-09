const axios = require('axios');
const BN = require('bn.js');
const web3 = require('web3');
const ObjectsToCsv = require('objects-to-csv');

let mapAmountByAddress = new Map();
const totalRequests = 1000;

const getTransactions = async (address, next, amountRequests) => {
    console.log('call getTransactions');
    try{    
        const response = await axios.get('API_URL', {
            params: {
                module: 'transactions',
                action: 'getTransactionsByAddress',
                address: address,
                next: next,
                limit: 500
            }
        });

        amountRequests++;

        const txs = response.data.data;
        txs.forEach(tx => {                
            if (tx.from == address){                
                const amount = new BN(tx.value.substring(2), 16);                
                if (mapAmountByAddress.has(tx.to)){                    
                    let sum = mapAmountByAddress.get(tx.to).add(amount);
                    mapAmountByAddress.set(tx.to, sum);
                }
                else{                    
                    mapAmountByAddress.set(tx.to, amount);
                }
            }                      
        });        
        
        if (response.data.pages.next && amountRequests < totalRequests){
            await getTransactions(address, response.data.pages.next, amountRequests);
        }
    }
    catch(err){
        console.log(err);
    }
};

(async () => {
    const address = 'ADDRESS_HERE'
    await getTransactions(address, null, 0);
    
    for(var key of mapAmountByAddress.keys()){
        let value = web3.utils.fromWei(mapAmountByAddress.get(key).toString(16));        
        mapAmountByAddress.set(key, value);
    }

    let csvData = [];
    for(var key of mapAmountByAddress.keys()){
        csvData.push({
            address: key,
            amount: mapAmountByAddress.get(key)
        });
    }

    const csv = new ObjectsToCsv(csvData);    
    await csv.toDisk((new Date()).toISOString() + address + '.csv');
})();