const axios = require('axios');
const BN = require('bn.js');
const web3 = require('web3');
const ObjectsToCsv = require('objects-to-csv');

let mapKeyValuesForMonthYear = new Map();
const totalRequests = 1;

const getMapKey = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return (date.getMonth() + 1).toString() + '_' + date.getFullYear().toString();
}

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

                if (mapKeyValuesForMonthYear.has(getMapKey(tx.timestamp))){
                    let keyValues = mapKeyValuesForMonthYear.get(getMapKey(tx.timestamp));                    
                    keyValues.amount = keyValues.amount.add(amount);
                    keyValues.txs++;
                }else{
                    let keyValues = {
                        amount: amount,
                        txs: 1
                    }                    
                    mapKeyValuesForMonthYear.set(getMapKey(tx.timestamp), keyValues);
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
    const address = 'ADDRESS_HERE';
    await getTransactions(address, null, 0);
    
    for(var key of mapKeyValuesForMonthYear.keys()){
        let keyValues = mapKeyValuesForMonthYear.get(key);
        keyValues.amount = web3.utils.fromWei(keyValues.amount).toString(16);
        mapKeyValuesForMonthYear.set(key, keyValues);
    }

    console.log(mapKeyValuesForMonthYear);

    let csvData = [];
    for(var key of mapKeyValuesForMonthYear.keys()){
        csvData.push({
            date: key,
            amount: (mapKeyValuesForMonthYear.get(key)).amount,
            txs: (mapKeyValuesForMonthYear.get(key)).txs
        });
    }

    const csv = new ObjectsToCsv(csvData);    
    await csv.toDisk((new Date()).toISOString() + 'summary' + address + '.csv');
})();