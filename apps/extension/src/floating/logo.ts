/** The logo on the floating UI. Listed in the manifest's web_accessible_resources, since it renders on x.com. */
export const logoUrl = (): string => chrome.runtime.getURL('icons/icon-128.png');
