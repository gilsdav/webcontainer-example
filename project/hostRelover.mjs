import { HostURL, isWebContainer } from '@webcontainer/env';
const hostURL = HostURL.parse('https://localhost:3000');
if (isWebContainer()) {
    console.log(hostURL.href);
} else {
    console.log(hostURL.href);
}
