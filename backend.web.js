import { Permissions, webMethod } from "wix-web-module";
import { contacts } from "wix-crm-backend";
import wixData from 'wix-data';
import { labels } from 'wix-crm.v2'

export const listMyFields = webMethod(
    Permissions.Anyone,
    async function () {
        try {
            const fields = await contacts.queryContacts();
            console.log(fields);

            // let results = await contacts.queryContacts().limit(1).find();
            // console.log(results.items[0]);

            // return results;
            const queryResults = await contacts.queryExtendedFields()
                .find({ suppressAuth: true });

            return queryResults.items
                .filter((field) => field.fieldType === "USER_DEFINED")
                .map((field) => field.key);

        } catch (error) {
            console.error("Error listing fields:", error);
            throw error;
        }
    }
);

export const updateUserLabels = webMethod(
    Permissions.Anyone,
    async (email, selectedCities) => {
        try {
            let contactList = await contacts.queryContacts()
                .eq("primaryInfo.email", email)
                .find({ suppressAuth: true });

            let contactData;

            if (contactList.items.length > 0) {
                contactData = {
                    contactId: contactList.items[0]._id,
                    revision: contactList.items[0].revision
                };
            } else {
                let newContact = await contacts.createContact({
                    emails: [{ email: email, tag: "UNTAGGED", primary: true }]
                });
                contactData = {
                    contactId: newContact._id,
                    revision: newContact.revision
                };
            }

            await contacts.updateContact(contactData, {
                extendedFields: {
                    "custom.city-tags": selectedCities.join(", ")
                }
            }, { suppressAuth: true });

            return { success: true, message: "City tags updated successfully!" };
        } catch (error) {
            console.error("Error updating city tags:", error);
            return { success: false, message: "Failed to update city tags." };
        }
    }
);

// export const assignLabelToContact = webMethod(
//     Permissions.Anyone,
//     async (contactId, labelKeys) => {
//         try {
//             const options = { suppressAuth: true };
//             // Get current labels; ensure we have an array even if no labels exist.
//             const currentLabels = (await getContactLabels(contactId)) || [];

//             // Separate the incoming labels into duplicates and unique ones.
//             const duplicateTagValues = labelKeys.filter(label => currentLabels.includes(label));
//             const uniqueTagValues = labelKeys.filter(label => !currentLabels.includes(label));

//             // If no unique tags remain, then we consider the operation a success.
//             if (uniqueTagValues.length === 0) {
//                 let duplicateTitles = [];
//                 try {
//                     const result = await wixData.query("Cities")
//                         .hasSome("tagNames", duplicateTagValues)
//                         .find();
//                     duplicateTitles = result.items.map(item => item.title);
//                 } catch (queryError) {
//                     console.error("Error querying Cities collection:", queryError);
//                     duplicateTitles = duplicateTagValues;
//                 }
//                 return {
//                     success: true,
//                     message: `No new labels to add. Label(s) ${duplicateTitles.join(', ')} already assigned.`
//                 };
//             }

//             // Otherwise, assign only the unique tags.
//             const updatedContact = await contacts.labelContact(contactId, uniqueTagValues, options);
//             console.log('Label successfully assigned to contact:', updatedContact);
//             return updatedContact;

//         } catch (error) {
//             console.error(error);
//             throw error;
//         }
//     }
// );

export const assignLabelToContact = webMethod(
    Permissions.Anyone,
    async (contactId, labelKeys) => {
        try {
            const options = { suppressAuth: true };
            // Retrieve current labels for the contact (assume these are label keys)
            const currentLabels = (await getContactLabels(contactId)) || [];

            // Separate incoming labels into duplicates and unique ones based on their display names
            const duplicateTagValues = labelKeys.filter(label => currentLabels.includes(label));
            const uniqueTagValues = labelKeys.filter(label => !currentLabels.includes(label));

            // If no new (unique) labels remain, return a success message.
            if (uniqueTagValues.length === 0) {
                let duplicateTitles = [];
                try {
                    const result = await wixData.query("Cities")
                        .hasSome("tagNames", duplicateTagValues)
                        .find();
                    duplicateTitles = result.items.map(item => item.title);
                } catch (queryError) {
                    console.error("Error querying Cities collection:", queryError);
                    duplicateTitles = duplicateTagValues;
                }
                return {
                    success: true,
                    message: `No new labels to add. Label(s) ${duplicateTitles.join(', ')} already assigned.`
                };
            }

            // For each unique label (display name), call myFindOrCreateLabelFunction to get the label key.
            const newLabelKeys = [];
            for (const labelName of uniqueTagValues) {
                const labelResult = await myFindOrCreateLabelFunction(labelName);
                if (labelResult && labelResult.label && labelResult.label.key) {
                    newLabelKeys.push(labelResult.label.key);
                } else {
                    console.error(`Label not found or created for: ${labelName}`);
                }
            }

            // Now assign the new label keys to the contact.
            const updatedContact = await contacts.labelContact(contactId, newLabelKeys, options);
            console.log('Label successfully assigned to contact:', updatedContact);
            return updatedContact;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
);

export const myFindOrCreateLabelFunction = webMethod(Permissions.Anyone, (displayName) => {

    const options = {
        suppressAuth: true,
    };

    let newLabel =
        contacts.findOrCreateLabel(displayName, options)
        .then((label) => {
            console.log("lable", label);
            return label;
        })
        .catch((error) => {
            console.error(error);
        });
    console.log("new label");
    return newLabel
});

export const createContactBackend = webMethod(
    Permissions.Anyone,
    async (firstName, lastName, email) => {
        const contactInfo = {
            name: {
                first: firstName,
                last: lastName
            },
            emails: [
                { email: email }
            ]
        };

        try {
            const resolvedContact = await contacts.appendOrCreateContact(contactInfo);
            console.log("Contact created or updated:", resolvedContact);
            return resolvedContact;
        } catch (error) {
            console.error("Error creating contact:", error);
            throw error;
        }
    }
);

//bbd346b3-3e59-4ed0-a316-f4f4c2e14cb8
//custom.losangelessubs
// "custom.sandiegosubs","custom.orangecountysubs",

export const getContactLabels = webMethod(
    Permissions.Anyone,
    async (contactId) => {
        try {
            const options = { suppressAuth: true }; // Add suppressAuth option
            const contact = await contacts.getContact(contactId, options);
            console.log(contact);
            const labels = contact.info.labelKeys;
            console.log('Labels assigned to the contact:', labels);
            return labels;
        } catch (error) {
            console.error('Error retrieving contact labels:', error);
            throw error;
        }
    }
);
export const queryLabelsWithAuth = webMethod(
    Permissions.Anyone,
    async (options) => {

        try {

            const finalOptions = { ...options, suppressAuth: true };
            const queryResults = await contacts.queryLabels().find(finalOptions);

            return queryResults.items;
        } catch (error) {
            console.error(error);

        }
    },
);
