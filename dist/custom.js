jQuery(function ($) {
    convForm = $('#chat').convform({selectInputStyle: 'disable'});
});
const API_URL = 'http://127.0.0.1:3012/api/chatboat/';
const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
}

$(document).ready(function () {
    serviceState = getNthNext(convForm.current, 1);
    accountCreateState = getNthNext(convForm.current, 2);
    balanceState = getNthNext(convForm.current, 3);
    transactionState = getNthNext(convForm.current, 4);
    depositState = getNthNext(convForm.current, 5);
    balanceWorkState = getNthNext(convForm.current, 6);
    confirmationState = getNthNext(convForm.current, 7);
    customerIdState = getNthNext(convForm.current, 8);
    facilityNameState = getNthNext(convForm.current, 10);
    facilityIdState = getNthNext(convForm.current, 11);
    productIdState = getNthNext(convForm.current, 12);
    inmateIdState = getNthNext(convForm.current, 13);
    customerNumberState = getNthNext(convForm.current, 14);
    depositAmountState = getNthNext(convForm.current, 15);
    displayAmountState = getNthNext(convForm.current, 16);
    creditCardNumberState = getNthNext(convForm.current, 18);
    expiryDateState = getNthNext(convForm.current, 19);
    cvvState = getNthNext(convForm.current, 20);
    transactionMsgState = getNthNext(convForm.current, 21);
    endChatState = getNthNext(convForm.current, 22);
});

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
                zip: stateWrapper.answers.customerZip.value,
            });
            if (result.status === 200) {
                stateWrapper.answers.contactAvailableNumbers = {value: result.data.contactNumbers};
                stateWrapper.answers.customerBalance = {value: result.data.balance, text: result.data.balance};
                stateWrapper.answers.customerAuthenticated = {value: true};
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
                navigateNextOnError(stateWrapper, ready, customerIdState, 'Sorry, we could not find your data. Please provide me your customer ID.');
            }
        } catch (error) {
            console.log(error);
            navigateNextOnError(stateWrapper, ready, customerIdState, 'Sorry, something went wrong. Please provide me your customer ID.');
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
                facilityIdState.input.answers = result.data.map(facility => {
                    return {text: facility.facility_name, value: facility.facility_id};
                });
                stateWrapper.current.next = facilityIdState;
                ready();
            } else {
                navigateNextOnError(stateWrapper, ready, facilityNameState, `${result.message}. Please enter facility name.`);
            }
        } catch (err) {
            navigateNextOnError(stateWrapper, ready, facilityNameState, 'Sorry, something went wrong. Please enter facility name.');
        }
    }
}

async function verifyProduct(stateWrapper, ready) {
    if (stateWrapper.answers.hasOwnProperty('facilityId')) {
        try {
            const result = await apiPost('product/verify', {
                facility_id: stateWrapper.answers.facilityId.value
            });
            if (result.status === 200) {
                productIdState.input.answers = result.data.map(product => {
                    const functionName = product.name === 'PPC' ? 'checkCustomerNumber' : 'checkInmate';
                    return {text: product.name, value: product.id, 'callback': functionName};
                });
                stateWrapper.answers.productsWithAmount = result.data.map(product => {
                    return {
                        text: product.id, value: {
                            fee_amount: product.fee_amount,
                            deposit_max: product.deposit_max ?? 50
                        }
                    };
                });
                stateWrapper.current.next = productIdState;
                ready();
            } else {
                navigateNextOnError(stateWrapper, ready, facilityIdState, `${result.message}. Please select facility.`);
            }
        } catch (err) {
            navigateNextOnError(stateWrapper, ready, facilityIdState, 'Sorry, something went wrong. Please select facility.');
        }
    }
}

async function checkInmate(stateWrapper, ready) {
    if (stateWrapper.answers.hasOwnProperty('inmateId')) {
        try {
            const result = await apiPost('inmate/verify', {
                facility_id: stateWrapper.answers.facilityId.value,
                inmate_id: stateWrapper.answers.inmateId.value
            });
            if (result.status === 200) {
                stateWrapper.current.next = depositAmountState;
                ready();
            } else {
                navigateNextOnError(stateWrapper, ready, inmateIdState, `${result.message}. Please enter inmate code for whom to deposit.`);
            }
        } catch (err) {
            navigateNextOnError(stateWrapper, ready, inmateIdState, 'Sorry, something went wrong. Please enter inmate code for whom to deposit.');
        }
    } else {
        stateWrapper.current.next = inmateIdState;
        ready();
    }
}

function checkCustomerNumber(stateWrapper, ready) {
    if (stateWrapper.answers.hasOwnProperty('customerNumber')) {
        stateWrapper.current.next = depositAmountState;
    } else {
        customerNumberState.input.answers = stateWrapper.answers.contactAvailableNumbers.value.map(number => {
            return {text: number, value: number};
        });
        stateWrapper.current.next = customerNumberState;
    }
    ready();
}

function checkAmount(stateWrapper, ready) {
    if (stateWrapper.answers.hasOwnProperty('depositAmount')) {
        const productAmount = stateWrapper.answers.productsWithAmount.find(product => product.text === stateWrapper.answers.productId.value);
        const maxAmount = productAmount.value.deposit_max;
        if (stateWrapper.answers.depositAmount.value > maxAmount) {
            navigateNextOnError(stateWrapper, ready, depositAmountState, `You cannot deposit amount more than $${maxAmount}. Please enter amount to deposit given account`);
        } else {
            const totalAmount = +stateWrapper.answers.depositAmount.value + +productAmount.value.fee_amount;
            stateWrapper.answers.totalAmount = {text: totalAmount.toString(), value: totalAmount};
            stateWrapper.current.next = displayAmountState;
            ready();
        }
    }
}

function checkExpiryDate(stateWrapper, ready) {
    if (stateWrapper.answers.hasOwnProperty('expiryDate')) {
        const monthYear = stateWrapper.answers.expiryDate.value.split('/');
        const month = parseInt(monthYear[0]);
        const year = parseInt('20' + monthYear[1]);

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        if (year < currentYear || (year === currentYear && month < currentMonth)) {
            navigateNextOnError(stateWrapper, ready, expiryDateState, `Invalid expiry date. Please enter valid month and year`);
        } else {
            stateWrapper.current.next = cvvState;
            ready();
        }
    }
}

function confirmTransaction(stateWrapper, ready) {
    stateWrapper.current.next = creditCardNumberState;
    ready();
}

async function processOrder(stateWrapper, ready) {
    try {
        const result = await apiPost('process/order', {
            transactionDetails: stateWrapper.answers,
        });
        if (result.status === 200) {
            navigateNextWithText(stateWrapper, transactionMsgState, confirmationState, 'Your transaction proceed successfully');
        } else {
            resetDepositDetails(stateWrapper);
            transactionMsgState.input.questions[0] = `${result.message}. Please try again.`;
            stateWrapper.current.next = transactionMsgState;
            stateWrapper.current.next.next = confirmationState;
        }
    } catch (err) {
        resetDepositDetails(stateWrapper);
        transactionMsgState.input.questions[0] = 'Sorry, something went wrong. Please try again.';
        stateWrapper.current.next = transactionMsgState;
        stateWrapper.current.next.next = confirmationState;
    }
    ready();
}

function cancelTransaction(stateWrapper, ready) {
    resetDepositDetails(stateWrapper);
    stateWrapper.current.next = confirmationState;
    ready();
}

//get back to the information choice
function rollback(stateWrapper, ready) {
    resetDepositDetails(stateWrapper);
    stateWrapper.current.next = serviceState;
    ready();
}

//to end the chat
function endChat(stateWrapper, ready) {
    stateWrapper.current.next = endChatState;
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

function navigateNextOnError(stateWrapper, ready, selectionState, displayText) {
    selectionState.input.questions[0] = displayText;
    stateWrapper.current.next = selectionState;
    ready();
}

function changeTextOnRepeat(selectionState, displayText) {
    selectionState.input.questions[0] = displayText;
    selectionState.answer = '';
    selectionState.next.answer = '';
}

//remove deposit balance answers from the state
function resetDepositDetails(stateWrapper) {
    const answers = stateWrapper.answers;
    let restoreAnswers = {
        uname: answers.uname.value,
    }
    if (answers.customerAuthenticated && answers.customerAuthenticated.value) {
        restoreAnswers = {
            ...restoreAnswers,
            customerId: answers.customerId.value,
            customerZip: answers.customerZip.value,
            contactAvailableNumbers: answers.contactAvailableNumbers.value,
            customerAuthenticated: answers.customerAuthenticated.value,
            customerBalance: answers.customerBalance.value,
            customerTransactions: answers.customerTransactions.value,
        }
    }
    stateWrapper.answers = {};
    Object.entries(restoreAnswers).forEach(([key, value]) => {
        stateWrapper.answers[key] = {value, text: value};
    });
    changeTextOnRepeat(facilityNameState, 'Please enter facility name');
    changeTextOnRepeat(facilityIdState, 'Select facility for product verification');
    changeTextOnRepeat(inmateIdState, 'Enter inmate code for whom to deposit');
    changeTextOnRepeat(depositAmountState, 'Enter amount to deposit given account');
    changeTextOnRepeat(expiryDateState, 'Enter the expiry date (MM/YY)');
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