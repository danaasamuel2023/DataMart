const axios = require('axios');
const ARKESEL_API_KEY = 'QkNhS0l2ZUZNeUdweEtmYVRUREg';

// Function to send SMS with retry capability
const sendSMS = async (phoneNumber, message, options = {}) => {
  const {
    senderID = 'Bundle',
    maxRetries = 2,
    timeout = 15000 // Increased timeout to 15 seconds
  } = options;

  const params = {
    action: 'send-sms',
    api_key: ARKESEL_API_KEY,
    to: phoneNumber,
    from: senderID,
    sms: message,
    use_case: 'transactional'
  };

  let attempts = 0;
  
  // Keep trying until max retries reached
  while (attempts <= maxRetries) {
    attempts++;
    
    try {
      console.log(`Sending SMS to ${phoneNumber} (Attempt ${attempts}/${maxRetries + 1})`);
      
      const response = await axios.get('https://sms.arkesel.com/sms/api', {
        params,
        timeout: timeout // Using the increased timeout
      });

      if (response.data.code === 'ok') {
        console.log(`✅ SUCCESS: SMS sent to ${phoneNumber}`);
        return { success: true, data: response.data };
      } else {
        const errorMessage = `API returned non-success code: ${response.data.code}`;
        console.error(`❌ FAILED: SMS to ${phoneNumber} - ${errorMessage}`);
        
        // If this is the last attempt, return the error
        if (attempts > maxRetries) {
          return { success: false, error: errorMessage };
        }
        
        // Otherwise wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      
      // Log different error types differently
      if (error.code === 'ECONNABORTED') {
        console.error(`⏱️ TIMEOUT: SMS to ${phoneNumber} - Request timed out`);
      } else if (error.response) {
        console.error(`❌ API ERROR: SMS to ${phoneNumber} - ${error.response.status} ${error.response.statusText}`);
      } else {
        console.error(`❌ ERROR: SMS to ${phoneNumber} - ${errorMessage}`);
      }
      
      // If this is the last attempt, return the error
      if (attempts > maxRetries) {
        return { success: false, error: errorMessage };
      }
      
      // Otherwise wait before retrying
      console.log(`Retrying in 3 seconds... (${attempts}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
};

// Build phone number batches to limit concurrent requests
const createBatches = (items, batchSize = 5) => {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
};

// Main function
async function main() {
  // Extract phone numbers from logs
  const logData = `
Refunded 4.7 to user 67dfcfe879da0f1372091d26 for order 67e1320779da0f13720b2fed
SMS request setup error: axios is not defined
Refund SMS sent to 0593153773 for order 67e1320779da0f13720b2fed
Refunded 4.7 to user 67e0d7ae79da0f13720ab23a for order 67e12e6379da0f13720b265b
SMS request setup error: axios is not defined
Refund SMS sent to 0541849707 for order 67e12e6379da0f13720b265b
Refunded 4.7 to user 67e0009b79da0f137209962e for order 67e12a8879da0f13720b1b6f
SMS request setup error: axios is not defined
Refund SMS sent to 0245187253 for order 67e12a8879da0f13720b1b6f
Refunded 4.7 to user 67e0b6ea79da0f13720a9ff8 for order 67e1249179da0f13720b0766
SMS request setup error: axios is not defined
Refund SMS sent to 0556352504 for order 67e1249179da0f13720b0766
Refunded 4.7 to user 67e05ba679da0f13720a4cb9 for order 67e0676e79da0f13720a5bac
SMS request setup error: axios is not defined
Refund SMS sent to 0551976647 for order 67e0676e79da0f13720a5bac
Refunded 4.7 to user 67dfc34779da0f1372090558 for order 67e0676c79da0f13720a5ba5
SMS request setup error: axios is not defined
Refund SMS sent to 0552496815 for order 67e0676c79da0f13720a5ba5
Refunded 4.7 to user 67e064e679da0f13720a585c for order 67e0675379da0f13720a5b8c
SMS request setup error: axios is not defined
Refund SMS sent to 0245495581 for order 67e0675379da0f13720a5b8c
Refunded 4.7 to user 67e0617a79da0f13720a5458 for order 67e0656079da0f13720a5932
SMS request setup error: axios is not defined
Refund SMS sent to 0243316169 for order 67e0656079da0f13720a5932
Refunded 4.7 to user 67e002cb79da0f1372099aa2 for order 67e064bf79da0f13720a5832
SMS request setup error: axios is not defined
Refund SMS sent to 0549472375 for order 67e064bf79da0f13720a5832
Refunded 4.7 to user 67e01d8979da0f137209da21 for order 67e0640e79da0f13720a575a
SMS request setup error: axios is not defined
Refund SMS sent to 0554426455 for order 67e0640e79da0f13720a575a
Refunded 4.7 to user 67e0614779da0f13720a5410 for order 67e0633179da0f13720a5666
SMS request setup error: axios is not defined
Refund SMS sent to 0540605884 for order 67e0633179da0f13720a5666
Refunded 4.7 to user 67dfc59679da0f1372090995 for order 67e060ee79da0f13720a53a4
SMS request setup error: axios is not defined
Refund SMS sent to 532866065 for order 67e060ee79da0f13720a53a4
Refunded 4.7 to user 67dfc59679da0f1372090995 for order 67e0609779da0f13720a5321
SMS request setup error: axios is not defined
Refund SMS sent to 532866065 for order 67e0609779da0f13720a5321
Refunded 3.9 to user 67dfb24e79da0f137208f26f for order 67e0608e79da0f13720a5311
SMS request setup error: axios is not defined
Refund SMS sent to 0555929213 for order 67e0608e79da0f13720a5311
Refunded 4.7 to user 67e05ed479da0f13720a507e for order 67e05f9879da0f13720a51a8
SMS request setup error: axios is not defined
Refund SMS sent to 0533182805 for order 67e05f9879da0f13720a51a8
Refunded 3.9 to user 67df5582433d9f5841890e88 for order 67e05f1979da0f13720a50d0
SMS request setup error: axios is not defined
Refund SMS sent to 0559597908 for order 67e05f1979da0f13720a50d0
Refunded 4.7 to user 67dfd08379da0f1372091e8b for order 67e05e5979da0f13720a4fec
SMS request setup error: axios is not defined
Refund SMS sent to 0599090641 for order 67e05e5979da0f13720a4fec
Refunded 4.7 to user 67dfe58379da0f1372095270 for order 67e05e5179da0f13720a4fe0
SMS request setup error: axios is not defined
Refund SMS sent to 0545141593 for order 67e05e5179da0f13720a4fe0
Refunded 4.7 to user 67e05ba679da0f13720a4cb9 for order 67e05e3179da0f13720a4fba
SMS request setup error: axios is not defined
Refund SMS sent to 0551976647 for order 67e05e3179da0f13720a4fba
Refunded 4.7 to user 67df9b3379da0f137208dc17 for order 67e05dce79da0f13720a4f12
SMS request setup error: axios is not defined
Refund SMS sent to 0546912246 for order 67e05dce79da0f13720a4f12
Refunded 4.7 to user 67e05afa79da0f13720a4b89 for order 67e05bc779da0f13720a4ce3
SMS request setup error: axios is not defined
Refund SMS sent to 0550323080 for order 67e05bc779da0f13720a4ce3
Refunded 4.7 to user 67df80a98af45c042bcc9249 for order 67e05bb579da0f13720a4cd1
SMS request setup error: axios is not defined
Refund SMS sent to 0549621714 for order 67e05bb579da0f13720a4cd1
Refunded 4.7 to user 67e058f779da0f13720a4849 for order 67e05b3079da0f13720a4be7
SMS request setup error: axios is not defined
Refund SMS sent to 0246332140 for order 67e05b3079da0f13720a4be7
Refunded 4.7 to user 67e0592579da0f13720a4888 for order 67e05ace79da0f13720a4b3f
SMS request setup error: axios is not defined
Refund SMS sent to 0247680218 for order 67e05ace79da0f13720a4b3f
Refunded 4.7 to user 67df82948af45c042bcc93d6 for order 67e05ab879da0f13720a4b1b
SMS request setup error: axios is not defined
Refund SMS sent to 0548221398 for order 67e05ab879da0f13720a4b1b
Refunded 4.7 to user 67e0568979da0f13720a4523 for order 67e05a9779da0f13720a4add
SMS request setup error: axios is not defined
Refund SMS sent to 0241391076 for order 67e05a9779da0f13720a4add
Refunded 4.7 to user 67e039c379da0f13720a1582 for order 67e05a6479da0f13720a4a72
SMS request setup error: axios is not defined
Refund SMS sent to 0592092596 for order 67e05a6479da0f13720a4a72
Refunded 4.7 to user 67dff5ba79da0f1372097e1e for order 67e05a1279da0f13720a49e2
SMS request setup error: axios is not defined
Refund SMS sent to 0530538270 for order 67e05a1279da0f13720a49e2
Refunded 4.7 to user 67dfc97579da0f1372090ff8 for order 67e0594c79da0f13720a48a9
SMS request setup error: axios is not defined
Refund SMS sent to 0537047334 for order 67e0594c79da0f13720a48a9
Refunded 4.7 to user 67e04c4779da0f13720a3608 for order 67e0565479da0f13720a44f4
SMS request setup error: axios is not defined
Refund SMS sent to 0244822242 for order 67e0565479da0f13720a44f4
Refunded 4.7 to user 67dfcd5e79da0f1372091815 for order 67e0561e79da0f13720a44c9
SMS request setup error: axios is not defined
Refund SMS sent to 0240059021 for order 67e0561e79da0f13720a44c9
Refunded 4.7 to user 67e0546b79da0f13720a4217 for order 67e0561179da0f13720a44ad
SMS request setup error: axios is not defined
Refund SMS sent to 0240474014 for order 67e0561179da0f13720a44ad
Refunded 4.7 to user 67dfcd5e79da0f1372091815 for order 67e0559779da0f13720a440b
SMS request setup error: axios is not defined
Refund SMS sent to 0240059021 for order 67e0559779da0f13720a440b
Refunded 4.7 to user 67e054b079da0f13720a428a for order 67e0557b79da0f13720a43df
SMS request setup error: axios is not defined
Refund SMS sent to 0534995213 for order 67e0557b79da0f13720a43df
Refunded 4.7 to user 67e016ae79da0f137209cc2b for order 67e054d379da0f13720a42cf
SMS request setup error: axios is not defined
Refund SMS sent to 0598605531 for order 67e054d379da0f13720a42cf
Refunded 4.7 to user 67e052f179da0f13720a4075 for order 67e054b579da0f13720a429a
SMS request setup error: axios is not defined
Refund SMS sent to 597858049 for order 67e054b579da0f13720a429a
Refunded 4.7 to user 67e053e479da0f13720a414e for order 67e0547479da0f13720a4224
SMS request setup error: axios is not defined
Refund SMS sent to 245226638 for order 67e0547479da0f13720a4224
Refunded 4.7 to user 67dfc34779da0f1372090558 for order 67e0543e79da0f13720a41d8
SMS request setup error: axios is not defined
Refund SMS sent to 0552496815 for order 67e0543e79da0f13720a41d8
Refunded 4.7 to user 67e0506479da0f13720a3cc1 for order 67e0543979da0f13720a41ca
SMS request setup error: axios is not defined
Refund SMS sent to 0546659683 for order 67e0543979da0f13720a41ca
Refunded 4.7 to user 67e0503d79da0f13720a3c90 for order 67e0533379da0f13720a40c2
SMS request setup error: axios is not defined
Refund SMS sent to 548887706 for order 67e0533379da0f13720a40c2
Refunded 4.7 to user 67e0034e79da0f1372099bb3 for order 67e0529a79da0f13720a3ffb
SMS request setup error: axios is not defined
Refund SMS sent to 0594544510 for order 67e0529a79da0f13720a3ffb
Refunded 4.7 to user 67e00ee979da0f137209b6be for order 67e0522479da0f13720a3f54
SMS request setup error: axios is not defined
Refund SMS sent to 0591516518 for order 67e0522479da0f13720a3f54
Refunded 4.7 to user 67e04f6e79da0f13720a3b3b for order 67e0521d79da0f13720a3f44
SMS request setup error: axios is not defined
Refund SMS sent to 0545430868 for order 67e0521d79da0f13720a3f44
Refunded 4.7 to user 67dffd5679da0f1372098f65 for order 67e0512e79da0f13720a3dd2
SMS request setup error: axios is not defined
Refund SMS sent to 0508832444 for order 67e0512e79da0f13720a3dd2
Refunded 4.7 to user 67e02a3a79da0f137209f50e for order 67e050a079da0f13720a3d06
SMS request setup error: axios is not defined
Refund SMS sent to 0245829714 for order 67e050a079da0f13720a3d06
Refunded 4.7 to user 67e04ed179da0f13720a3a3b for order 67e0507c79da0f13720a3cdf
SMS request setup error: axios is not defined
Refund SMS sent to 240166890 for order 67e0507c79da0f13720a3cdf
Refunded 4.7 to user 67df66098af45c042bcc82d0 for order 67e0504779da0f13720a3c9e
SMS request setup error: axios is not defined
Refund SMS sent to 0243777810 for order 67e0504779da0f13720a3c9e
Refunded 4.7 to user 67e04f6479da0f13720a3b2e for order 67e04ff379da0f13720a3c19
SMS request setup error: axios is not defined
Refund SMS sent to 0591649784 for order 67e04ff379da0f13720a3c19
Refunded 4.7 to user 67e0491b79da0f13720a2f73 for order 67e04f9979da0f13720a3b83
SMS request setup error: axios is not defined
Refund SMS sent to 0551574751 for order 67e04f9979da0f13720a3b83
Refunded 4.7 to user 67e04d7679da0f13720a380a for order 67e04f6279da0f13720a3b27
SMS request setup error: axios is not defined
Refund SMS sent to 0542090913 for order 67e04f6279da0f13720a3b27
Refunded 4.7 to user 67dfcd0679da0f1372091775 for order 67e04edb79da0f13720a3a55
SMS request setup error: axios is not defined
Refund SMS sent to 0509359584 for order 67e04edb79da0f13720a3a55
Refunded 4.7 to user 67e04d2b79da0f13720a3788 for order 67e04e6479da0f13720a3985
SMS request setup error: axios is not defined
Refund SMS sent to 0559634559 for order 67e04e6479da0f13720a3985
Refunded 4.7 to user 67e002fb79da0f1372099aea for order 67e04d9279da0f13720a383c
SMS request setup error: axios is not defined
Refund SMS sent to 0533434222 for order 67e04d9279da0f13720a383c
Refunded 4.7 to user 67e04a3e79da0f13720a31e6 for order 67e04cfb79da0f13720a3746
SMS request setup error: axios is not defined
Refund SMS sent to 551046775 for order 67e04cfb79da0f13720a3746
Refunded 4.7 to user 67dfff4a79da0f13720993b4 for order 67e04ba679da0f13720a3507
SMS request setup error: axios is not defined
Refund SMS sent to 0531890156 for order 67e04ba679da0f13720a3507
Refunded 4.7 to user 67df8f8179da0f137208d3f0 for order 67e04b6379da0f13720a348e
SMS request setup error: axios is not defined
Refund SMS sent to 0545445674 for order 67e04b6379da0f13720a348e
Refunded 4.7 to user 67e049f179da0f13720a3137 for order 67e04b4979da0f13720a3463
SMS request setup error: axios is not defined
Refund SMS sent to 0591551267 for order 67e04b4979da0f13720a3463
Refunded 4.7 to user 67df6f938af45c042bcc891f for order 67e04add79da0f13720a338b
SMS request setup error: axios is not defined
Refund SMS sent to 0533339124 for order 67e04add79da0f13720a338b
Refunded 4.7 to user 67e0411379da0f13720a23ac for order 67e04ac779da0f13720a3355
SMS request setup error: axios is not defined
Refund SMS sent to 0548270348 for order 67e04ac779da0f13720a3355
Refunded 4.7 to user 67e049c879da0f13720a30d6 for order 67e04ab179da0f13720a332e
SMS request setup error: axios is not defined
Refund SMS sent to 0596094137 for order 67e04ab179da0f13720a332e
Refunded 4.7 to user 67e0492379da0f13720a2f82 for order 67e04a6879da0f13720a3268
SMS request setup error: axios is not defined
Refund SMS sent to 0545330190 for order 67e04a6879da0f13720a3268
Refunded 4.7 to user 67dff92a79da0f1372098658 for order 67e049cc79da0f13720a30e4
SMS request setup error: axios is not defined
Refund SMS sent to 0549854687 for order 67e049cc79da0f13720a30e4
Refunded 4.7 to user 67dff92a79da0f1372098658 for order 67e049b579da0f13720a30b1
SMS request setup error: axios is not defined
Refund SMS sent to 0549854687 for order 67e049b579da0f13720a30b1
Refunded 4.7 to user 67e0469179da0f13720a2baa for order 67e049b579da0f13720a30ad
SMS request setup error: axios is not defined
Refund SMS sent to 0249086850 for order 67e049b579da0f13720a30ad
Refunded 4.7 to user 67e0479079da0f13720a2d36 for order 67e0497979da0f13720a302c
SMS request setup error: axios is not defined
Refund SMS sent to 0557372776 for order 67e0497979da0f13720a302c
Refunded 4.7 to user 67e0449a79da0f13720a2873 for order 67e0493b79da0f13720a2fb9
SMS request setup error: axios is not defined
Refund SMS sent to 542264654 for order 67e0493b79da0f13720a2fb9
Refunded 4.7 to user 67e03b0a79da0f13720a1890 for order 67e048c479da0f13720a2ed7
SMS request setup error: axios is not defined
Refund SMS sent to 0257940987 for order 67e048c479da0f13720a2ed7
Refunded 4.7 to user 67df8f5379da0f137208d3c8 for order 67e0456d79da0f13720a29ad
SMS request setup error: axios is not defined
Refund SMS sent to 0596852322 for order 67e0456d79da0f13720a29ad
Refunded 4.7 to user 67e0387379da0f13720a1230 for order 67e03a3979da0f13720a16b7
SMS request setup error: axios is not defined
Refund SMS sent to 0249030414 for order 67e03a3979da0f13720a16b7
Refunded 4.7 to user 67e037f379da0f13720a1117 for order 67e03a1279da0f13720a1644
SMS request setup error: axios is not defined
Refund SMS sent to 0545224339 for order 67e03a1279da0f13720a1644
Refunded 4.7 to user 67e0376779da0f13720a0f4d for order 67e039d379da0f13720a15a6
SMS request setup error: axios is not defined
Refund SMS sent to 0241796997 for order 67e039d379da0f13720a15a6
Auth middleware error: read ECONNRESET
Refunded 4.7 to user 67e01b5c79da0f137209d57b for order 67e0391879da0f13720a13ae
SMS request setup error: axios is not defined
Refund SMS sent to 0598440442 for order 67e0391879da0f13720a13ae
Refunded 4.7 to user 67dfef2479da0f1372096cd0 for order 67e038fd79da0f13720a1354
SMS request setup error: axios is not defined
Refund SMS sent to 0245618624 for order 67e038fd79da0f13720a1354
Refunded 4.7 to user 67e0362579da0f13720a0c7e for order 67e0379979da0f13720a0ffc
SMS request setup error: axios is not defined
Refund SMS sent to 0545295657 for order 67e0379979da0f13720a0ffc
Refunded 4.7 to user 67e0365579da0f13720a0cc6 for order 67e0377679da0f13720a0f8c
SMS request setup error: axios is not defined
Refund SMS sent to 0554897070 for order 67e0377679da0f13720a0f8c
Refunded 4.7 to user 67e035f079da0f13720a0c2c for order 67e0375279da0f13720a0f1d
SMS request setup error: axios is not defined
Refund SMS sent to richardeffah360@gmail.com for order 67e0375279da0f13720a0f1d
Refunded 4.7 to user 67dfd8bf79da0f13720931d2 for order 67e0374979da0f13720a0ef9
SMS request setup error: axios is not defined
Refund SMS sent to 0552075897 for order 67e0374979da0f13720a0ef9
Refunded 4.7 to user 67e0320579da0f13720a04dc for order 67e0367779da0f13720a0d12
SMS request setup error: axios is not defined
Refund SMS sent to 0245995821 for order 67e0367779da0f13720a0d12
Refunded 4.7 to user 67e0354c79da0f13720a0b19 for order 67e035e779da0f13720a0c12
Refund SMS sent to 0554171347 for order 67e035e779da0f13720a0c12
Refunded 4.7 to user 67e0342379da0f13720a08b6 for order 67e034e679da0f13720a0a3d
SMS request setup error: axios is not defined
Refund SMS sent to 0272830312 for order 67e034e679da0f13720a0a3d
Refunded 4.7 to user 67d8cce08866a1bdba3a5d2d for order 67dc03d92bebb1cdd2a3530b
SMS request setup error: axios is not defined
Refund SMS sent to 0500647580 for order 67dc03d92bebb1cdd2a3530b`;

  // Extract phone numbers and order references
  const regex = /Refund SMS sent to ([\d]+) for order ([a-z0-9]+)/g;
  const phoneData = [];
  
  let match;
  while ((match = regex.exec(logData)) !== null) {
    const phoneNumber = match[1];
    const orderRef = match[2];
    
    // Skip if not a valid phone number or contains '@'
    if (phoneNumber.length < 9 || phoneNumber.includes('@')) {
      continue;
    }
    
    phoneData.push({ phoneNumber, orderRef });
  }
  
  console.log(`Found ${phoneData.length} phone numbers to send SMS to.`);
  
  // Create batches of 5 numbers each to process
  const batches = createBatches(phoneData, 5);
  const results = { success: 0, failed: 0 };
  
  // Process each batch sequentially
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\nProcessing batch ${i+1}/${batches.length} (${batch.length} numbers)`);
    
    // Process numbers in each batch concurrently
    const batchPromises = batch.map(async ({ phoneNumber, orderRef }) => {
      const message = `DATAMART: Your order for data bundle yesterday could not be processed 1gb. Your account has been refunded. Thank you for choosing DATAMART.`;
      
      try {
        const result = await sendSMS(phoneNumber, message, {
          maxRetries: 2,
          timeout: 15000
        });
        
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
        }
        
        return { phoneNumber, orderRef, success: result.success };
      } catch (error) {
        results.failed++;
        console.error(`Unhandled error for ${phoneNumber}:`, error);
        return { phoneNumber, orderRef, success: false };
      }
    });
    
    // Wait for all numbers in this batch to be processed
    await Promise.all(batchPromises);
    
    // Wait between batches to avoid overwhelming the API
    if (i < batches.length - 1) {
      console.log(`Waiting 5 seconds before processing next batch...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log(`\n===== SMS Sending Summary =====`);
  console.log(`Total: ${phoneData.length}`);
  console.log(`Successful: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`=============================`);
}

// Run the script
main().catch(err => {
  console.error('Fatal error in main process:', err);
  process.exit(1);
});