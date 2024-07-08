jQuery(function ($) {
    convForm = $('#chat').convform({selectInputStyle: 'disable'});
});
const API_URL = 'API_URL';
const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
}

$(document).ready(function () {
    console.log(convForm);
    accountCreateState = getNthNext(convForm.current, 2);
    balanceState = getNthNext(convForm.current, 3);
    transactionState = getNthNext(convForm.current, 4);
    depositState = getNthNext(convForm.current, 5);
    balanceWorkState = getNthNext(convForm.current, 6);
    confirmationState = getNthNext(convForm.current, 7);
    customerIdState = getNthNext(convForm.current, 8);
    facilityNameState = getNthNext(convForm.current, 10);
    facilityIdState = getNthNext(convForm.current, 11);
    endChatState = getNthNext(convForm.current, 12);
});

let endChatState = false;
let serviceState = false;

async function apiPost(endpoint, data) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: headers,
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.log('Error:', error);
        throw error;
    }
}

async function checkCredentials(stateWrapper, ready) {
    if (stateWrapper.answers.hasOwnProperty('customerId') && stateWrapper.answers.hasOwnProperty('customerZip')) {
        try {
            const result = await apiPost('customer/verify', {
                user_id: stateWrapper.answers.customerId.value,
                zip: stateWrapper.answers.customerZip.value
            });
            if (result.status === 200) {
                stateWrapper.answers.customerNumber = {
                    value: result.data.contact_number,
                    text: result.data.contact_number
                };
                stateWrapper.answers.customerBalance = {value: result.data.balance, text: result.data.balance};
                stateWrapper.answers.customerAuthenticated = {value: true, text: true};
                stateWrapper.answers.customerTransactions = {value: result.data.transactions};
                if (stateWrapper.answers.service) {
                    if (stateWrapper.answers.service.value === 'balance') {
                        navigateNextWithText(stateWrapper, balanceState, confirmationState, 'Your balance is ${customerBalance}:0');
                    } else if (stateWrapper.answers.service.value === 'check_transaction') {
                        navigateNextWithText(stateWrapper, transactionState, confirmationState, showTransactionTable(result.data.transactions));
                    } else if (stateWrapper.answers.service.value === 'balance_deposit') {
                        stateWrapper.current.next = facilityNameState;
                    }
                }
                ready();
            } else {
                customerIdState.input.questions[0] = 'Sorry, we could not find your data. Please provide me your customer ID.';
                stateWrapper.current.next = customerIdState;
                ready();
            }
        } catch (error) {
            customerIdState.input.questions[0] = 'Sorry, something went wrong. Please provide me your customer ID.';
            stateWrapper.current.next = customerIdState;
            ready(false);
        }
    }
}

async function checkFacility(stateWrapper, ready) {
    if (stateWrapper.answers.hasOwnProperty('facilityName')) {
        try {
            const result = await apiPost('facility/verify', {
                name: stateWrapper.answers.facilityName.value
            });
            if (result.status === 200) {
                const facilities = result.data;
                let options = '';
                options = facilities.map(facility => {
                    return {text: facility.facility_name, value: facility.facility_id};
                });
                facilityIdState.html(options);
                stateWrapper.current.next = facilityIdState;
                ready();
            } else {
                facilityNameState.input.questions[0] = `${result.message}. Please enter facility name.`;
                stateWrapper.current.next = facilityNameState;
                ready();
            }
        } catch (err) {
            facilityNameState.input.questions[0] = 'Sorry, something went wrong. Please enter facility name.';
            stateWrapper.current.next = facilityNameState;
            ready();
        }
    }
}

function verifyProduct(stateWrapper, ready){
    console.log(stateWrapper.answers.facilityId.value);
}
//store state to get back user for service options
function storeServiceState(stateWrapper, ready) {
    if (!serviceState) {
        serviceState = stateWrapper.current.next;
    }
    ready();
}

//get back to the information choice
function rollback(stateWrapper, ready) {
    if (serviceState) {
        stateWrapper.current.next = serviceState;
    }
    ready();
}

//to end the chat
function endChat(stateWrapper, ready) {
    if (endChatState) {
        stateWrapper.current.next = endChatState;
    }
    ready();
}

function fetchBalance(stateWrapper, ready) {
    if (stateWrapper.answers.customerAuthenticated) {
        navigateNextWithText(stateWrapper, balanceState, confirmationState, 'Your balance is ${customerBalance}:0');
    } else {
        stateWrapper.current.next = customerIdState;
    }
    ready();
}

function createAccount(stateWrapper, ready) {
    window.open("https://cp.regentpay.com/account/create");
    stateWrapper.current.next = accountCreateState;
    ready();
}

function balanceWorkInfo(stateWrapper, ready) {
    stateWrapper.current.next = balanceWorkState;
    ready();
}

function depositBalance(stateWrapper, ready) {
    if (stateWrapper.answers.customerAuthenticated) {
        stateWrapper.current.next = facilityNameState;
    } else {
        stateWrapper.current.next = customerIdState;
    }
    ready();
}

function checkTransaction(stateWrapper, ready) {
    if (stateWrapper.answers.customerAuthenticated) {
        navigateNextWithText(stateWrapper, transactionState, confirmationState, showTransactionTable(stateWrapper.answers.customerTransactions.value));
    } else {
        stateWrapper.current.next = customerIdState;
    }
    ready();
}

function getNthNext(node, position, current = 0) {
    if (!node || current === position) {
        return node;
    }
    return getNthNext(node.next, position, current + 1);
}

function navigateNextWithText(stateWrapper, selectionState, confirmationState, displayText) {
    selectionState.input.questions[0] = displayText;
    stateWrapper.current.next = selectionState;
    stateWrapper.current.next.next = confirmationState;
}

function navigateNextOnError(stateWrapper, ready, selectionState) {
    customerIdState.input.questions[0] = 'Sorry, we could not find your data. Please provide me your customer ID.';
    stateWrapper.current.next = customerIdState;
    ready();
}

function showTransactionTable(transactions) {
    let rows = '<tr><td colspan="4">No transactions found</td></tr>';
    if (transactions.length > 0) {
        rows = transactions.map(transaction => {
            return `<tr>
                        <td>${transaction.ct_updated_date}</td>
                        <td>${transaction.ct_amount}</td>
                        <td>${transaction.ct_type}</td>
                        <td>${transaction.ct_description}</td>
                    </tr>`;
        }).join('');
    }
    return `<table class="table table-bordered table-striped table-hover">
            <thead>
            <tr>
                <th>Transaction Date</th>
                <th>Amount</th>
                <th>Transaction Type</th>
                <th>Description</th>
            </tr>
            </thead>
            <tbody>${rows}</tbody>
            </table>`
}