const { SESClient, GetSendQuotaCommand } = require('@aws-sdk/client-ses');

async function testCredentials() {
  try {
    console.log('Testing AWS credentials...');
    const ses = new SESClient({ region: 'us-east-1' });
    
    const command = new GetSendQuotaCommand({});
    const result = await ses.send(command);
    
    console.log('Credentials work! SES Quota:', result);
  } catch (error) {
    console.error('Credential test failed:', error);
  }
}

testCredentials(); 