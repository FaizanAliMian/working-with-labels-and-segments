import wixData from "wix-data";
import { assignLabelToContact, createContactBackend } from 'backend/data.web';
$w.onReady(async function () {
    initializeUI();
    attachEventListeners();
    await populateCheckbox();

    function initializeUI() {
        hideError();
        hideSuccess();
    }

    $w("#submitButton").onClick(async () => {
        try {
            let formData = getFormData();
            validateFormData(formData);
            await saveFormData(formData);

            let contactResult = await createContactBackend(formData.firstName, formData.lastName, formData.email);
            let contactId = contactResult.contactId || contactResult.id;
            //console.log(contactId);

            let updateResponse = await assignLabelToContact(contactId, formData.selectedCheckboxValues);
            //console.log("City tags updated successfully in Wix CRM!", updateResponse);
            const successMsg = (updateResponse.success && updateResponse.message) ?
                updateResponse.message :
                "Subscription successful!";
            showSuccess(successMsg);
        } catch (error) {
            //console.error("Error handling form submission:", error);
            showError(error.message || "An error occurred while processing your request.");
        }
    });

});

function hideSuccess() {
    $w("#successMessage").hide();
}

function hideError() {
    $w("#errorMessage").hide();
}

function attachEventListeners() {
    $w("#firstName").onInput(clearError);
    $w("#lastName").onInput(clearError);
    $w("#email").onInput(clearError);
    $w("#checkboxGroup").onChange(clearError);
    $w("#agreementCheckbox").onChange(clearError);
}

function clearError() {
    $w("#errorMessage").text = "";
    $w("#errorMessage").hide();
}
async function populateCheckbox() {
    try {
        let results = await wixData.query("Cities").find();
        if (results.items.length > 0) {
            let options = results.items.map(item => ({
                label: item.tagNames,
                value: item.tagNames
            }));
            $w("#checkboxGroup").options = options;
        }
    } catch (error) {
        //console.error("Error fetching checkbox options:", error);
    }
}

function getFormData() {
    const selectedValues = $w("#checkboxGroup").value;
    const options = $w("#checkboxGroup").options;
    const selectedLabels = options
        .filter(option => selectedValues.includes(option.value))
        .map(option => option.label);
    return {
        firstName: $w("#firstName").value,
        lastName: $w("#lastName").value,
        email: $w("#email").value,
        selectedCheckboxValues: $w("#checkboxGroup").value,
        selectedLabels: selectedLabels,
        agreed: $w("#agreementCheckbox").checked

    };
}

function validateFormData(formData) {
    if (!formData.firstName) {
        throw new Error("Please enter your first name.");
    }
    if (!formData.lastName) {
        throw new Error("Please enter your last name.");
    }
    if (!formData.email) {
        throw new Error("Please enter your email address.");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        throw new Error("Please enter a valid email address.");
    }
    if (!formData.selectedCheckboxValues || formData.selectedCheckboxValues.length === 0) {
        throw new Error("Please select at least one option.");
    }
    if (!formData.agreed) {
        throw new Error("You must agree to subscribe.");
    }
}

async function saveFormData(formData) {
    try {
        const results = await wixData.query("Subscribers")
            .eq("email", formData.email)
            .find();
        if (results.items.length > 0) {
            let subscriber = results.items[0];
            subscriber.firstName = formData.firstName;
            subscriber.lastName = formData.lastName;
            subscriber.selectedCheckboxValues = formData.selectedCheckboxValues;
            subscriber.selectedLabels = formData.selectedLabels;
            subscriber.agreed = formData.agreed;
            await wixData.update("Subscribers", subscriber);
        } else {
            await wixData.insert("Subscribers", formData);
        }
    } catch (error) {
        throw new Error("Error saving form data: " + error.message);
    }
}

function showSuccess(message) {
    $w("#successMessage").text = message;
    $w("#successMessage").show();
    $w("#errorMessage").hide();
}

function showError(message) {
    $w("#errorMessage").text = message;
    $w("#errorMessage").show();
    $w("#successMessage").hide();
}
