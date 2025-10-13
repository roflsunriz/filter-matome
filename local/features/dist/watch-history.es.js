true              &&(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
}());

const addOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%2013h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'/%3e%3c/svg%3e";

const analyticsOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%203H5c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h14c1.1%200%202-.9%202-2V5c0-1.1-.9-2-2-2zm0%2016H5V5h14v14z'/%3e%3cpath%20d='M7%2012h2v5H7zm8-5h2v10h-2zm-4%207h2v3h-2zm0-4h2v2h-2z'/%3e%3c/svg%3e";

const arrowDownwardOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m20%2012-1.41-1.41L13%2016.17V4h-2v12.17l-5.58-5.59L4%2012l8%208%208-8z'/%3e%3c/svg%3e";

const arrowUpwardOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m4%2012%201.41%201.41L11%207.83V20h2V7.83l5.58%205.59L20%2012l-8-8-8%208z'/%3e%3c/svg%3e";

const assignmentOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M7%2015h7v2H7zm0-4h10v2H7zm0-4h10v2H7zm12-4h-4.18C14.4%201.84%2013.3%201%2012%201c-1.3%200-2.4.84-2.82%202H5c-.14%200-.27.01-.4.04a2.008%202.008%200%200%200-1.44%201.19c-.1.23-.16.49-.16.77v14c0%20.27.06.54.16.78s.25.45.43.64c.27.27.62.47%201.01.55.13.02.26.03.4.03h14c1.1%200%202-.9%202-2V5c0-1.1-.9-2-2-2zm-7-.25c.41%200%20.75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zM19%2019H5V5h14v14z'/%3e%3c/svg%3e";

const audiotrackOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%203v10.55c-.59-.34-1.27-.55-2-.55-2.21%200-4%201.79-4%204s1.79%204%204%204%204-1.79%204-4V7h4V3h-6zm-2%2016c-1.1%200-2-.9-2-2s.9-2%202-2%202%20.9%202%202-.9%202-2%202z'/%3e%3c/svg%3e";

const backupOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19.35%2010.04A7.49%207.49%200%200%200%2012%204C9.11%204%206.6%205.64%205.35%208.04A5.994%205.994%200%200%200%200%2014c0%203.31%202.69%206%206%206h13c2.76%200%205-2.24%205-5%200-2.64-2.05-4.78-4.65-4.96zM19%2018H6c-2.21%200-4-1.79-4-4%200-2.05%201.53-3.76%203.56-3.97l1.07-.11.5-.95A5.469%205.469%200%200%201%2012%206c2.62%200%204.88%201.86%205.39%204.43l.3%201.5%201.53.11A2.98%202.98%200%200%201%2022%2015c0%201.65-1.35%203-3%203zM8%2013h2.55v3h2.9v-3H16l-4-4z'/%3e%3c/svg%3e";

const barChartOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M4%209h4v11H4zm12%204h4v7h-4zm-6-9h4v16h-4z'/%3e%3c/svg%3e";

const blockOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zM4%2012c0-4.42%203.58-8%208-8%201.85%200%203.55.63%204.9%201.69L5.69%2016.9A7.902%207.902%200%200%201%204%2012zm8%208c-1.85%200-3.55-.63-4.9-1.69L18.31%207.1A7.902%207.902%200%200%201%2020%2012c0%204.42-3.58%208-8%208z'/%3e%3c/svg%3e";

const bookmarkOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M17%203H7c-1.1%200-2%20.9-2%202v16l7-3%207%203V5c0-1.1-.9-2-2-2z'/%3e%3c/svg%3e";

const bugReportOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M20%208h-2.81a5.985%205.985%200%200%200-1.82-1.96L17%204.41%2015.59%203l-2.17%202.17C12.96%205.06%2012.49%205%2012%205s-.96.06-1.41.17L8.41%203%207%204.41l1.62%201.63C7.88%206.55%207.26%207.22%206.81%208H4v2h2.09c-.05.33-.09.66-.09%201v1H4v2h2v1c0%20.34.04.67.09%201H4v2h2.81c1.04%201.79%202.97%203%205.19%203s4.15-1.21%205.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-4%204v3c0%20.22-.03.47-.07.7l-.1.65-.37.65c-.72%201.24-2.04%202-3.46%202s-2.74-.77-3.46-2l-.37-.64-.1-.65A4.27%204.27%200%200%201%208%2015v-4c0-.23.03-.48.07-.7l.1-.65.37-.65c.3-.52.72-.97%201.21-1.31l.57-.39.74-.18a3.787%203.787%200%200%201%201.89%200l.68.16.61.42c.5.34.91.78%201.21%201.31l.38.65.1.65c.04.22.07.47.07.69v1zm-6%202h4v2h-4zm0-4h4v2h-4z'/%3e%3c/svg%3e";

const buildOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m22.61%2018.99-9.08-9.08c.93-2.34.45-5.1-1.44-7C9.79.61%206.21.4%203.66%202.26L7.5%206.11%206.08%207.52%202.25%203.69C.39%206.23.6%209.82%202.9%2012.11c1.86%201.86%204.57%202.35%206.89%201.48l9.11%209.11c.39.39%201.02.39%201.41%200l2.3-2.3c.4-.38.4-1.01%200-1.41zm-3%201.6-9.46-9.46c-.61.45-1.29.72-2%20.82-1.36.2-2.79-.21-3.83-1.25C3.37%209.76%202.93%208.5%203%207.26l3.09%203.09%204.24-4.24-3.09-3.09c1.24-.07%202.49.37%203.44%201.31a4.469%204.469%200%200%201%201.24%203.96%204.35%204.35%200%200%201-.88%201.96l9.45%209.45-.88.89z'/%3e%3c/svg%3e";

const cardGiftcardOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M20%206h-2.18c.11-.31.18-.65.18-1a2.996%202.996%200%200%200-5.5-1.65l-.5.67-.5-.68C10.96%202.54%2010.05%202%209%202%207.34%202%206%203.34%206%205c0%20.35.07.69.18%201H4c-1.11%200-1.99.89-1.99%202L2%2019c0%201.11.89%202%202%202h16c1.11%200%202-.89%202-2V8c0-1.11-.89-2-2-2zm-5-2c.55%200%201%20.45%201%201s-.45%201-1%201-1-.45-1-1%20.45-1%201-1zM9%204c.55%200%201%20.45%201%201s-.45%201-1%201-1-.45-1-1%20.45-1%201-1zm11%2015H4v-2h16v2zm0-5H4V8h5.08L7%2010.83%208.62%2012%2012%207.4l3.38%204.6L17%2010.83%2014.92%208H20v6z'/%3e%3c/svg%3e";

const checkOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M9%2016.17%204.83%2012l-1.42%201.41L9%2019%2021%207l-1.41-1.41L9%2016.17z'/%3e%3c/svg%3e";

const checkBoxOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%203H5c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h14c1.1%200%202-.9%202-2V5c0-1.1-.9-2-2-2zm0%2016H5V5h14v14zM17.99%209l-1.41-1.42-6.59%206.59-2.58-2.57-1.42%201.41%204%203.99z'/%3e%3c/svg%3e";

const checkBoxOutlineBlankOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%205v14H5V5h14m0-2H5c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h14c1.1%200%202-.9%202-2V5c0-1.1-.9-2-2-2z'/%3e%3c/svg%3e";

const checkCircleOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm0%2018c-4.41%200-8-3.59-8-8s3.59-8%208-8%208%203.59%208%208-3.59%208-8%208zm4.59-12.42L10%2014.17l-2.59-2.58L6%2013l4%204%208-8z'/%3e%3c/svg%3e";

const clearOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%206.41%2017.59%205%2012%2010.59%206.41%205%205%206.41%2010.59%2012%205%2017.59%206.41%2019%2012%2013.41%2017.59%2019%2019%2017.59%2013.41%2012%2019%206.41z'/%3e%3c/svg%3e";

const clearAllOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M5%2013h14v-2H5v2zm-2%204h14v-2H3v2zM7%207v2h14V7H7z'/%3e%3c/svg%3e";

const closeOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%206.41%2017.59%205%2012%2010.59%206.41%205%205%206.41%2010.59%2012%205%2017.59%206.41%2019%2012%2013.41%2017.59%2019%2019%2017.59%2013.41%2012%2019%206.41z'/%3e%3c/svg%3e";

const cloudOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%206c2.62%200%204.88%201.86%205.39%204.43l.3%201.5%201.53.11A2.98%202.98%200%200%201%2022%2015c0%201.65-1.35%203-3%203H6c-2.21%200-4-1.79-4-4%200-2.05%201.53-3.76%203.56-3.97l1.07-.11.5-.95A5.469%205.469%200%200%201%2012%206m0-2C9.11%204%206.6%205.64%205.35%208.04A5.994%205.994%200%200%200%200%2014c0%203.31%202.69%206%206%206h13c2.76%200%205-2.24%205-5%200-2.64-2.05-4.78-4.65-4.96A7.49%207.49%200%200%200%2012%204z'/%3e%3c/svg%3e";

const cloudDownloadOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19.35%2010.04A7.49%207.49%200%200%200%2012%204C9.11%204%206.6%205.64%205.35%208.04A5.994%205.994%200%200%200%200%2014c0%203.31%202.69%206%206%206h13c2.76%200%205-2.24%205-5%200-2.64-2.05-4.78-4.65-4.96zM19%2018H6c-2.21%200-4-1.79-4-4%200-2.05%201.53-3.76%203.56-3.97l1.07-.11.5-.95A5.469%205.469%200%200%201%2012%206c2.62%200%204.88%201.86%205.39%204.43l.3%201.5%201.53.11A2.98%202.98%200%200%201%2022%2015c0%201.65-1.35%203-3%203zm-5.55-8h-2.9v3H8l4%204%204-4h-2.55z'/%3e%3c/svg%3e";

const cloudUploadOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19.35%2010.04A7.49%207.49%200%200%200%2012%204C9.11%204%206.6%205.64%205.35%208.04A5.994%205.994%200%200%200%200%2014c0%203.31%202.69%206%206%206h13c2.76%200%205-2.24%205-5%200-2.64-2.05-4.78-4.65-4.96zM19%2018H6c-2.21%200-4-1.79-4-4%200-2.05%201.53-3.76%203.56-3.97l1.07-.11.5-.95A5.469%205.469%200%200%201%2012%206c2.62%200%204.88%201.86%205.39%204.43l.3%201.5%201.53.11A2.98%202.98%200%200%201%2022%2015c0%201.65-1.35%203-3%203zM8%2013h2.55v3h2.9v-3H16l-4-4z'/%3e%3c/svg%3e";

const colorLensOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%2022C6.49%2022%202%2017.51%202%2012S6.49%202%2012%202s10%204.04%2010%209c0%203.31-2.69%206-6%206h-1.77c-.28%200-.5.22-.5.5%200%20.12.05.23.13.33.41.47.64%201.06.64%201.67A2.5%202.5%200%200%201%2012%2022zm0-18c-4.41%200-8%203.59-8%208s3.59%208%208%208c.28%200%20.5-.22.5-.5a.54.54%200%200%200-.14-.35c-.41-.46-.63-1.05-.63-1.65a2.5%202.5%200%200%201%202.5-2.5H16c2.21%200%204-1.79%204-4%200-3.86-3.59-7-8-7z'/%3e%3ccircle%20cx='6.5'%20cy='11.5'%20r='1.5'/%3e%3ccircle%20cx='9.5'%20cy='7.5'%20r='1.5'/%3e%3ccircle%20cx='14.5'%20cy='7.5'%20r='1.5'/%3e%3ccircle%20cx='17.5'%20cy='11.5'%20r='1.5'/%3e%3c/svg%3e";

const commentOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M21.99%204c0-1.1-.89-2-1.99-2H4c-1.1%200-2%20.9-2%202v12c0%201.1.9%202%202%202h14l4%204-.01-18zM20%204v13.17L18.83%2016H4V4h16zM6%2012h12v2H6zm0-3h12v2H6zm0-3h12v2H6z'/%3e%3c/svg%3e";

const contentCopyOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16%201H4c-1.1%200-2%20.9-2%202v14h2V3h12V1zm3%204H8c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h11c1.1%200%202-.9%202-2V7c0-1.1-.9-2-2-2zm0%2016H8V7h11v14z'/%3e%3c/svg%3e";

const dashboardOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%205v2h-4V5h4M9%205v6H5V5h4m10%208v6h-4v-6h4M9%2017v2H5v-2h4M21%203h-8v6h8V3zM11%203H3v10h8V3zm10%208h-8v10h8V11zm-10%204H3v6h8v-6z'/%3e%3c/svg%3e";

const deleteOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16%209v10H8V9h8m-1.5-6h-5l-1%201H5v2h14V4h-3.5l-1-1zM18%207H6v12c0%201.1.9%202%202%202h8c1.1%200%202-.9%202-2V7z'/%3e%3c/svg%3e";

const deleteForeverOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M14.12%2010.47%2012%2012.59l-2.13-2.12-1.41%201.41L10.59%2014l-2.12%202.12%201.41%201.41L12%2015.41l2.12%202.12%201.41-1.41L13.41%2014l2.12-2.12zM15.5%204l-1-1h-5l-1%201H5v2h14V4zM6%2019c0%201.1.9%202%202%202h8c1.1%200%202-.9%202-2V7H6v12zM8%209h8v10H8V9z'/%3e%3c/svg%3e";

const deleteOutlineOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M6%2019c0%201.1.9%202%202%202h8c1.1%200%202-.9%202-2V7H6v12zM8%209h8v10H8V9zm7.5-5-1-1h-5l-1%201H5v2h14V4h-3.5z'/%3e%3c/svg%3e";

const deleteSweepOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M15%2016h4v2h-4zm0-8h7v2h-7zm0%204h6v2h-6zM3%2018c0%201.1.9%202%202%202h6c1.1%200%202-.9%202-2V8H3v10zm2-8h6v8H5v-8zm5-6H6L5%205H2v2h12V5h-3z'/%3e%3c/svg%3e";

const downloadOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%209h-4V3H9v6H5l7%207%207-7zm-8%202V5h2v6h1.17L12%2013.17%209.83%2011H11zm-6%207h14v2H5z'/%3e%3c/svg%3e";

const driveFileMoveOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M20%206h-8l-2-2H4c-1.1%200-2%20.9-2%202v12c0%201.1.9%202%202%202h16c1.1%200%202-.9%202-2V8c0-1.1-.9-2-2-2zm0%2012H4V6h5.17l1.41%201.41.59.59H20v10zm-7.84-6H8v2h4.16l-1.59%201.59L11.99%2017%2016%2013.01%2011.99%209l-1.41%201.41L12.16%2012z'/%3e%3c/svg%3e";

const editOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m14.06%209.02.92.92L5.92%2019H5v-.92l9.06-9.06M17.66%203c-.25%200-.51.1-.7.29l-1.83%201.83%203.75%203.75%201.83-1.83a.996.996%200%200%200%200-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6%203.19L3%2017.25V21h3.75L17.81%209.94l-3.75-3.75z'/%3e%3c/svg%3e";

const errorOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm1%2015h-2v-2h2v2zm0-4h-2V7h2v6z'/%3e%3c/svg%3e";

const expandLessOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m12%208-6%206%201.41%201.41L12%2010.83l4.59%204.58L18%2014l-6-6z'/%3e%3c/svg%3e";

const expandMoreOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16.59%208.59%2012%2013.17%207.41%208.59%206%2010l6%206%206-6-1.41-1.41z'/%3e%3c/svg%3e";

const fastForwardOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M15%209.86%2018.03%2012%2015%2014.14V9.86m-9%200L9.03%2012%206%2014.14V9.86M13%206v12l8.5-6L13%206zM4%206v12l8.5-6L4%206z'/%3e%3c/svg%3e";

const fastRewindOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18%209.86v4.28L14.97%2012%2018%209.86m-9%200v4.28L5.97%2012%209%209.86M20%206l-8.5%206%208.5%206V6zm-9%200-8.5%206%208.5%206V6z'/%3e%3c/svg%3e";

const favoriteOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m12%2021.35-1.45-1.32C5.4%2015.36%202%2012.28%202%208.5%202%205.42%204.42%203%207.5%203c1.74%200%203.41.81%204.5%202.09C13.09%203.81%2014.76%203%2016.5%203%2019.58%203%2022%205.42%2022%208.5c0%203.78-3.4%206.86-8.55%2011.54L12%2021.35z'/%3e%3c/svg%3e";

const fileDownloadOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18%2015v3H6v-3H4v3c0%201.1.9%202%202%202h12c1.1%200%202-.9%202-2v-3h-2zm-1-4-1.41-1.41L13%2012.17V4h-2v8.17L8.41%209.59%207%2011l5%205%205-5z'/%3e%3c/svg%3e";

const fileUploadOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18%2015v3H6v-3H4v3c0%201.1.9%202%202%202h12c1.1%200%202-.9%202-2v-3h-2zM7%209l1.41%201.41L11%207.83V16h2V7.83l2.59%202.58L17%209l-5-5-5%205z'/%3e%3c/svg%3e";

const filterListOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M10%2018h4v-2h-4v2zM3%206v2h18V6H3zm3%207h12v-2H6v2z'/%3e%3c/svg%3e";

const firstPageOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18.41%2016.59%2013.82%2012l4.59-4.59L17%206l-6%206%206%206%201.41-1.41zM6%206h2v12H6V6z'/%3e%3c/svg%3e";

const flashOnOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M7%202v11h3v9l7-12h-4l3-8z'/%3e%3c/svg%3e";

const folderOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m9.17%206%202%202H20v10H4V6h5.17M10%204H4c-1.1%200-1.99.9-1.99%202L2%2018c0%201.1.9%202%202%202h16c1.1%200%202-.9%202-2V8c0-1.1-.9-2-2-2h-8l-2-2z'/%3e%3c/svg%3e";

const folderOpenOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M20%206h-8l-2-2H4c-1.1%200-1.99.9-1.99%202L2%2018c0%201.1.9%202%202%202h16c1.1%200%202-.9%202-2V8c0-1.1-.9-2-2-2zm0%2012H4V8h16v10z'/%3e%3c/svg%3e";

const forward10OutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18%2013c0%203.31-2.69%206-6%206s-6-2.69-6-6%202.69-6%206-6v4l5-5-5-5v4c-4.42%200-8%203.58-8%208s3.58%208%208%208%208-3.58%208-8h-2z'/%3e%3cpath%20d='M10.9%2016v-4.27h-.09l-1.77.63v.69l1.01-.31V16zm3.42-4.22c-.18-.07-.37-.1-.59-.1s-.41.03-.59.1-.33.18-.45.33-.23.34-.29.57-.1.5-.1.82v.74c0%20.32.04.6.11.82s.17.42.3.57.28.26.46.33.37.1.59.1.41-.03.59-.1.33-.18.45-.33.22-.34.29-.57.1-.5.1-.82v-.74c0-.32-.04-.6-.11-.82s-.17-.42-.3-.57-.29-.26-.46-.33zm.01%202.57c0%20.19-.01.35-.04.48s-.06.24-.11.32-.11.14-.19.17-.16.05-.25.05-.18-.02-.25-.05-.14-.09-.19-.17-.09-.19-.12-.32-.04-.29-.04-.48v-.97c0-.19.01-.35.04-.48s.06-.23.12-.31.11-.14.19-.17.16-.05.25-.05.18.02.25.05.14.09.19.17.09.18.12.31.04.29.04.48v.97z'/%3e%3c/svg%3e";

const fullscreenOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M7%2014H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12%207h-3v2h5v-5h-2v3zM14%205v2h3v3h2V5h-5z'/%3e%3c/svg%3e";

const fullscreenExitOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M5%2016h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6%2011h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z'/%3e%3c/svg%3e";

const gpsFixedOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%208c-2.21%200-4%201.79-4%204s1.79%204%204%204%204-1.79%204-4-1.79-4-4-4zm8.94%203A8.994%208.994%200%200%200%2013%203.06V1h-2v2.06A8.994%208.994%200%200%200%203.06%2011H1v2h2.06A8.994%208.994%200%200%200%2011%2020.94V23h2v-2.06A8.994%208.994%200%200%200%2020.94%2013H23v-2h-2.06zM12%2019c-3.87%200-7-3.13-7-7s3.13-7%207-7%207%203.13%207%207-3.13%207-7%207z'/%3e%3c/svg%3e";

const helpOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm1%2017h-2v-2h2v2zm2.07-7.75-.9.92C13.45%2012.9%2013%2013.5%2013%2015h-2v-.5c0-1.1.45-2.1%201.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41%200-1.1-.9-2-2-2s-2%20.9-2%202H8c0-2.21%201.79-4%204-4s4%201.79%204%204c0%20.88-.36%201.68-.93%202.25z'/%3e%3c/svg%3e";

const historyOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M13%203a9%209%200%200%200-9%209H1l3.89%203.89.07.14L9%2012H6c0-3.87%203.13-7%207-7s7%203.13%207%207-3.13%207-7%207c-1.93%200-3.68-.79-4.94-2.06l-1.42%201.42A8.954%208.954%200%200%200%2013%2021a9%209%200%200%200%200-18zm-1%205v5l4.25%202.52.77-1.28-3.52-2.09V8z'/%3e%3c/svg%3e";

const homeOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m12%205.69%205%204.5V18h-2v-6H9v6H7v-7.81l5-4.5M12%203%202%2012h3v8h6v-6h2v6h6v-8h3L12%203z'/%3e%3c/svg%3e";

const imageOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19%205v14H5V5h14m0-2H5c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h14c1.1%200%202-.9%202-2V5c0-1.1-.9-2-2-2zm-4.86%208.86-3%203.87L9%2013.14%206%2017h12l-3.86-5.14z'/%3e%3c/svg%3e";

const infoOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M11%207h2v2h-2zm0%204h2v6h-2zm1-9C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm0%2018c-4.41%200-8-3.59-8-8s3.59-8%208-8%208%203.59%208%208-3.59%208-8%208z'/%3e%3c/svg%3e";

const keyboardOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M20%207v10H4V7h16m0-2H4c-1.1%200-1.99.9-1.99%202L2%2017c0%201.1.9%202%202%202h16c1.1%200%202-.9%202-2V7c0-1.1-.9-2-2-2zm-9%203h2v2h-2zm0%203h2v2h-2zM8%208h2v2H8zm0%203h2v2H8zm-3%200h2v2H5zm0-3h2v2H5zm3%206h8v2H8zm6-3h2v2h-2zm0-3h2v2h-2zm3%203h2v2h-2zm0-3h2v2h-2z'/%3e%3c/svg%3e";

const labelOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M17.63%205.84C17.27%205.33%2016.67%205%2016%205L5%205.01C3.9%205.01%203%205.9%203%207v10c0%201.1.9%201.99%202%201.99L16%2019c.67%200%201.27-.33%201.63-.84L22%2012l-4.37-6.16zM16%2017H5V7h11l3.55%205L16%2017z'/%3e%3c/svg%3e";

const languageOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M11.99%202C6.47%202%202%206.48%202%2012s4.47%2010%209.99%2010C17.52%2022%2022%2017.52%2022%2012S17.52%202%2011.99%202zm6.93%206h-2.95a15.65%2015.65%200%200%200-1.38-3.56A8.03%208.03%200%200%201%2018.92%208zM12%204.04c.83%201.2%201.48%202.53%201.91%203.96h-3.82c.43-1.43%201.08-2.76%201.91-3.96zM4.26%2014C4.1%2013.36%204%2012.69%204%2012s.1-1.36.26-2h3.38c-.08.66-.14%201.32-.14%202s.06%201.34.14%202H4.26zm.82%202h2.95c.32%201.25.78%202.45%201.38%203.56A7.987%207.987%200%200%201%205.08%2016zm2.95-8H5.08a7.987%207.987%200%200%201%204.33-3.56A15.65%2015.65%200%200%200%208.03%208zM12%2019.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43%201.43-1.08%202.76-1.91%203.96zM14.34%2014H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16%201.32.16%202s-.07%201.34-.16%202zm.25%205.56c.6-1.11%201.06-2.31%201.38-3.56h2.95a8.03%208.03%200%200%201-4.33%203.56zM16.36%2014c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26%201.31.26%202s-.1%201.36-.26%202h-3.38z'/%3e%3c/svg%3e";

const lightbulbOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M9%2021c0%20.55.45%201%201%201h4c.55%200%201-.45%201-1v-1H9v1zm3-19C8.14%202%205%205.14%205%209c0%202.38%201.19%204.47%203%205.74V17c0%20.55.45%201%201%201h6c.55%200%201-.45%201-1v-2.26c1.81-1.27%203-3.36%203-5.74%200-3.86-3.14-7-7-7zm2.85%2011.1-.85.6V16h-4v-2.3l-.85-.6A4.997%204.997%200%200%201%207%209c0-2.76%202.24-5%205-5s5%202.24%205%205c0%201.63-.8%203.16-2.15%204.1z'/%3e%3c/svg%3e";

const linkOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M17%207h-4v2h4c1.65%200%203%201.35%203%203s-1.35%203-3%203h-4v2h4c2.76%200%205-2.24%205-5s-2.24-5-5-5zm-6%208H7c-1.65%200-3-1.35-3-3s1.35-3%203-3h4V7H7c-2.76%200-5%202.24-5%205s2.24%205%205%205h4v-2zm-3-4h8v2H8z'/%3e%3c/svg%3e";

const listOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M3%2013h2v-2H3v2zm0%204h2v-2H3v2zm0-8h2V7H3v2zm4%204h14v-2H7v2zm0%204h14v-2H7v2zM7%207v2h14V7H7zm-4%206h2v-2H3v2zm0%204h2v-2H3v2zm0-8h2V7H3v2zm4%204h14v-2H7v2zm0%204h14v-2H7v2zM7%207v2h14V7H7z'/%3e%3c/svg%3e";

const liveTvOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M9%2010v8l7-4zm12-4h-7.58l3.29-3.29L16%202l-4%204h-.03l-4-4-.69.71L10.56%206H3c-1.1%200-2%20.9-2%202v12c0%201.1.9%202%202%202h18c1.1%200%202-.9%202-2V8c0-1.1-.9-2-2-2zm0%2014H3V8h18v12z'/%3e%3c/svg%3e";

const lockOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18%208h-1V6c0-2.76-2.24-5-5-5S7%203.24%207%206v2H6c-1.1%200-2%20.9-2%202v10c0%201.1.9%202%202%202h12c1.1%200%202-.9%202-2V10c0-1.1-.9-2-2-2zM9%206c0-1.66%201.34-3%203-3s3%201.34%203%203v2H9V6zm9%2014H6V10h12v10zm-6-3c1.1%200%202-.9%202-2s-.9-2-2-2-2%20.9-2%202%20.9%202%202%202z'/%3e%3c/svg%3e";

const menuOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M3%2018h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z'/%3e%3c/svg%3e";

const menuBookOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M21%205c-1.11-.35-2.33-.5-3.5-.5-1.95%200-4.05.4-5.5%201.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45%204.9%201%206v14.65c0%20.25.25.5.5.5.1%200%20.15-.05.25-.05C3.1%2020.45%205.05%2020%206.5%2020c1.95%200%204.05.4%205.5%201.5%201.35-.85%203.8-1.5%205.5-1.5%201.65%200%203.35.3%204.75%201.05.1.05.15.05.25.05.25%200%20.5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0%2013.5c-1.1-.35-2.3-.5-3.5-.5-1.7%200-4.15.65-5.5%201.5V8c1.35-.85%203.8-1.5%205.5-1.5%201.2%200%202.4.15%203.5.5v11.5z'/%3e%3cpath%20d='M17.5%2010.5c.88%200%201.73.09%202.5.26V9.24c-.79-.15-1.64-.24-2.5-.24-1.7%200-3.24.29-4.5.83v1.66c1.13-.64%202.7-.99%204.5-.99zM13%2012.49v1.66c1.13-.64%202.7-.99%204.5-.99.88%200%201.73.09%202.5.26V11.9c-.79-.15-1.64-.24-2.5-.24-1.7%200-3.24.3-4.5.83zm4.5%201.84c-1.7%200-3.24.29-4.5.83v1.66c1.13-.64%202.7-.99%204.5-.99.88%200%201.73.09%202.5.26v-1.52c-.79-.16-1.64-.24-2.5-.24z'/%3e%3c/svg%3e";

const moreHorizOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M6%2010c-1.1%200-2%20.9-2%202s.9%202%202%202%202-.9%202-2-.9-2-2-2zm12%200c-1.1%200-2%20.9-2%202s.9%202%202%202%202-.9%202-2-.9-2-2-2zm-6%200c-1.1%200-2%20.9-2%202s.9%202%202%202%202-.9%202-2-.9-2-2-2z'/%3e%3c/svg%3e";

const moreVertOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%208c1.1%200%202-.9%202-2s-.9-2-2-2-2%20.9-2%202%20.9%202%202%202zm0%202c-1.1%200-2%20.9-2%202s.9%202%202%202%202-.9%202-2-.9-2-2-2zm0%206c-1.1%200-2%20.9-2%202s.9%202%202%202%202-.9%202-2-.9-2-2-2z'/%3e%3c/svg%3e";

const movieOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M4%206.47%205.76%2010H20v8H4V6.47M22%204h-4l2%204h-3l-2-4h-2l2%204h-3l-2-4H8l2%204H7L5%204H4c-1.1%200-1.99.9-1.99%202L2%2018c0%201.1.9%202%202%202h16c1.1%200%202-.9%202-2V4z'/%3e%3c/svg%3e";

const movieCreationOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M5.76%2010H20v8H4V6.47M22%204h-4l2%204h-3l-2-4h-2l2%204h-3l-2-4H8l2%204H7L5%204H4c-1.1%200-2%20.9-2%202v12c0%201.1.9%202%202%202h16c1.1%200%202-.9%202-2V4z'/%3e%3c/svg%3e";

const navigateBeforeOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M15.61%207.41%2014.2%206l-6%206%206%206%201.41-1.41L11.03%2012l4.58-4.59z'/%3e%3c/svg%3e";

const navigateNextOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M10.02%206%208.61%207.41%2013.19%2012l-4.58%204.59L10.02%2018l6-6-6-6z'/%3e%3c/svg%3e";

const newReleasesOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m23%2012-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12%203%208.6%201.54%206.71%204.72l-3.61.81.34%203.68L1%2012l2.44%202.78-.34%203.69%203.61.82%201.89%203.18L12%2021l3.4%201.46%201.89-3.18%203.61-.82-.34-3.68L23%2012zm-4.51%202.11.26%202.79-2.74.62-1.43%202.41L12%2018.82l-2.58%201.11-1.43-2.41-2.74-.62.26-2.8L3.66%2012l1.85-2.12-.26-2.78%202.74-.61%201.43-2.41L12%205.18l2.58-1.11%201.43%202.41%202.74.62-.26%202.79L20.34%2012l-1.85%202.11zM11%2015h2v2h-2zm0-8h2v6h-2z'/%3e%3c/svg%3e";

const noteOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16%204H4c-1.1%200-2%20.9-2%202v12.01c0%201.1.9%201.99%202%201.99h16c1.1%200%202-.9%202-2v-8l-6-6zM4%2018.01V6h11v5h5v7.01H4z'/%3e%3c/svg%3e";

const notificationImportantOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M10.01%2021.01c0%201.1.89%201.99%201.99%201.99s1.99-.89%201.99-1.99h-3.98zM12%206c2.76%200%205%202.24%205%205v7H7v-7c0-2.76%202.24-5%205-5zm0-4.5c-.83%200-1.5.67-1.5%201.5v1.17C7.36%204.85%205%207.65%205%2011v6l-2%202v1h18v-1l-2-2v-6c0-3.35-2.36-6.15-5.5-6.83V3c0-.83-.67-1.5-1.5-1.5zM11%208h2v4h-2zm0%206h2v2h-2z'/%3e%3c/svg%3e";

const notificationsOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%2022c1.1%200%202-.9%202-2h-4c0%201.1.9%202%202%202zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5%201.5v.68C7.64%205.36%206%207.92%206%2011v5l-2%202v1h16v-1l-2-2zm-2%201H8v-6c0-2.48%201.51-4.5%204-4.5s4%202.02%204%204.5v6z'/%3e%3c/svg%3e";

const paletteOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%2022C6.49%2022%202%2017.51%202%2012S6.49%202%2012%202s10%204.04%2010%209c0%203.31-2.69%206-6%206h-1.77c-.28%200-.5.22-.5.5%200%20.12.05.23.13.33.41.47.64%201.06.64%201.67A2.5%202.5%200%200%201%2012%2022zm0-18c-4.41%200-8%203.59-8%208s3.59%208%208%208c.28%200%20.5-.22.5-.5a.54.54%200%200%200-.14-.35c-.41-.46-.63-1.05-.63-1.65a2.5%202.5%200%200%201%202.5-2.5H16c2.21%200%204-1.79%204-4%200-3.86-3.59-7-8-7z'/%3e%3ccircle%20cx='6.5'%20cy='11.5'%20r='1.5'/%3e%3ccircle%20cx='9.5'%20cy='7.5'%20r='1.5'/%3e%3ccircle%20cx='14.5'%20cy='7.5'%20r='1.5'/%3e%3ccircle%20cx='17.5'%20cy='11.5'%20r='1.5'/%3e%3c/svg%3e";

const pauseOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M6%2019h4V5H6v14zm8-14v14h4V5h-4z'/%3e%3c/svg%3e";

const personOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%206c1.1%200%202%20.9%202%202s-.9%202-2%202-2-.9-2-2%20.9-2%202-2m0%2010c2.7%200%205.8%201.29%206%202H6c.23-.72%203.31-2%206-2m0-12C9.79%204%208%205.79%208%208s1.79%204%204%204%204-1.79%204-4-1.79-4-4-4zm0%2010c-2.67%200-8%201.34-8%204v2h16v-2c0-2.66-5.33-4-8-4z'/%3e%3c/svg%3e";

const playArrowOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M10%208.64%2015.27%2012%2010%2015.36V8.64M8%205v14l11-7L8%205z'/%3e%3c/svg%3e";

const playCircleOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm0%2018c-4.41%200-8-3.59-8-8s3.59-8%208-8%208%203.59%208%208-3.59%208-8%208zm-2.5-3.5%207-4.5-7-4.5v9z'/%3e%3c/svg%3e";

const playlistAddOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M14%2010H3v2h11v-2zm0-4H3v2h11V6zm4%208v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3%2016h7v-2H3v2z'/%3e%3c/svg%3e";

const playlistAddCircleOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm0%2018c-4.41%200-8-3.59-8-8s3.59-8%208-8%208%203.59%208%208-3.59%208-8%208zm2-10H7v2h7v-2zm0-3H7v2h7V7zm-7%208h3v-2H7v2zm12-2v2h-2v2h-2v-2h-2v-2h2v-2h2v2h2z'/%3e%3c/svg%3e";

const publicOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zM4%2012c0-.61.08-1.21.21-1.78L8.99%2015v1c0%201.1.9%202%202%202v1.93C7.06%2019.43%204%2016.07%204%2012zm13.89%205.4c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55%200%201-.45%201-1V7h2c1.1%200%202-.9%202-2v-.41C17.92%205.77%2020%208.65%2020%2012c0%202.08-.81%203.98-2.11%205.4z'/%3e%3c/svg%3e";

const publishOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M5%204h14v2H5zm0%2010h4v6h6v-6h4l-7-7-7%207zm8-2v6h-2v-6H9.83L12%209.83%2014.17%2012H13z'/%3e%3c/svg%3e";

const pushPinOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M14%204v5c0%201.12.37%202.16%201%203H9c.65-.86%201-1.9%201-3V4h4m3-2H7c-.55%200-1%20.45-1%201s.45%201%201%201h1v5c0%201.66-1.34%203-3%203v2h5.97v7l1%201%201-1v-7H19v-2c-1.66%200-3-1.34-3-3V4h1c.55%200%201-.45%201-1s-.45-1-1-1z'/%3e%3c/svg%3e";

const radioButtonUncheckedOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm0%2018c-4.42%200-8-3.58-8-8s3.58-8%208-8%208%203.58%208%208-3.58%208-8%208z'/%3e%3c/svg%3e";

const refreshOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M17.65%206.35A7.958%207.958%200%200%200%2012%204c-4.42%200-7.99%203.58-7.99%208s3.57%208%207.99%208c3.73%200%206.84-2.55%207.73-6h-2.08A5.99%205.99%200%200%201%2012%2018c-3.31%200-6-2.69-6-6s2.69-6%206-6c1.66%200%203.14.69%204.22%201.78L13%2011h7V4l-2.35%202.35z'/%3e%3c/svg%3e";

const repeatOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M7%207h10v3l4-4-4-4v3H5v6h2V7zm10%2010H7v-3l-4%204%204%204v-3h12v-6h-2v4z'/%3e%3c/svg%3e";

const replay10OutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M11.99%205V1l-5%205%205%205V7c3.31%200%206%202.69%206%206s-2.69%206-6%206-6-2.69-6-6h-2c0%204.42%203.58%208%208%208s8-3.58%208-8-3.58-8-8-8zm-1.1%2011h-.85v-3.26l-1.01.31v-.69l1.77-.63h.09V16zm4.28-1.76c0%20.32-.03.6-.1.82s-.17.42-.29.57-.28.26-.45.33-.37.1-.59.1-.41-.03-.59-.1-.33-.18-.46-.33-.23-.34-.3-.57-.11-.5-.11-.82v-.74c0-.32.03-.6.1-.82s.17-.42.29-.57.28-.26.45-.33.37-.1.59-.1.41.03.59.1.33.18.46.33.23.34.3.57.11.5.11.82v.74zm-.85-.86c0-.19-.01-.35-.04-.48s-.07-.23-.12-.31-.11-.14-.19-.17-.16-.05-.25-.05-.18.02-.25.05-.14.09-.19.17-.09.18-.12.31-.04.29-.04.48v.97c0%20.19.01.35.04.48s.07.24.12.32.11.14.19.17.16.05.25.05.18-.02.25-.05.14-.09.19-.17.09-.19.11-.32.04-.29.04-.48v-.97z'/%3e%3c/svg%3e";

const rocketLaunchOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M6%2015c-.83%200-1.58.34-2.12.88C2.7%2017.06%202%2022%202%2022s4.94-.7%206.12-1.88A2.996%202.996%200%200%200%206%2015zm.71%203.71c-.28.28-2.17.76-2.17.76s.47-1.88.76-2.17c.17-.19.42-.3.7-.3a1.003%201.003%200%200%201%20.71%201.71zm10.71-5.06c6.36-6.36%204.24-11.31%204.24-11.31S16.71.22%2010.35%206.58l-2.49-.5a2.03%202.03%200%200%200-1.81.55L2%2010.69l5%202.14L11.17%2017l2.14%205%204.05-4.05c.47-.47.68-1.15.55-1.81l-.49-2.49zM7.41%2010.83l-1.91-.82%201.97-1.97%201.44.29c-.57.83-1.08%201.7-1.5%202.5zm6.58%207.67-.82-1.91c.8-.42%201.67-.93%202.49-1.5l.29%201.44-1.96%201.97zM16%2012.24c-1.32%201.32-3.38%202.4-4.04%202.73l-2.93-2.93c.32-.65%201.4-2.71%202.73-4.04%204.68-4.68%208.23-3.99%208.23-3.99s.69%203.55-3.99%208.23zM15%2011c1.1%200%202-.9%202-2s-.9-2-2-2-2%20.9-2%202%20.9%202%202%202z'/%3e%3c/svg%3e";

const saveOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M17%203H5a2%202%200%200%200-2%202v14a2%202%200%200%200%202%202h14c1.1%200%202-.9%202-2V7l-4-4zm2%2016H5V5h11.17L19%207.83V19zm-7-7c-1.66%200-3%201.34-3%203s1.34%203%203%203%203-1.34%203-3-1.34-3-3-3zM6%206h9v4H6z'/%3e%3c/svg%3e";

const scheduleOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M11.99%202C6.47%202%202%206.48%202%2012s4.47%2010%209.99%2010C17.52%2022%2022%2017.52%2022%2012S17.52%202%2011.99%202zM12%2020c-4.42%200-8-3.58-8-8s3.58-8%208-8%208%203.58%208%208-3.58%208-8%208zm.5-13H11v6l5.25%203.15.75-1.23-4.5-2.67z'/%3e%3c/svg%3e";

const scienceOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M13%2011.33%2018%2018H6l5-6.67V6h2m2.96-2H8.04c-.42%200-.65.48-.39.81L9%206.5v4.17L3.2%2018.4c-.49.66-.02%201.6.8%201.6h16c.82%200%201.29-.94.8-1.6L15%2010.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81z'/%3e%3c/svg%3e";

const searchOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M15.5%2014h-.79l-.28-.27A6.471%206.471%200%200%200%2016%209.5%206.5%206.5%200%201%200%209.5%2016c1.61%200%203.09-.59%204.23-1.57l.27.28v.79l5%204.99L20.49%2019l-4.99-5zm-6%200C7.01%2014%205%2011.99%205%209.5S7.01%205%209.5%205%2014%207.01%2014%209.5%2011.99%2014%209.5%2014z'/%3e%3c/svg%3e";

const settingsOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M19.43%2012.98c.04-.32.07-.64.07-.98%200-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46a.5.5%200%200%200-.61-.22l-2.49%201c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488%200%200%200%2014%202h-4c-.25%200-.46.18-.49.42l-.38%202.65c-.61.25-1.17.59-1.69.98l-2.49-1a.566.566%200%200%200-.18-.03c-.17%200-.34.09-.43.25l-2%203.46c-.13.22-.07.49.12.64l2.11%201.65c-.04.32-.07.65-.07.98%200%20.33.03.66.07.98l-2.11%201.65c-.19.15-.24.42-.12.64l2%203.46a.5.5%200%200%200%20.61.22l2.49-1c.52.4%201.08.73%201.69.98l.38%202.65c.03.24.24.42.49.42h4c.25%200%20.46-.18.49-.42l.38-2.65c.61-.25%201.17-.59%201.69-.98l2.49%201c.06.02.12.03.18.03.17%200%20.34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73%200%20.21-.02.43-.05.73l-.14%201.13.89.7%201.08.84-.7%201.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16%201.13-.2%201.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21%201.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21%201.27.51%201.04.42.9-.68c.43-.32.84-.56%201.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19%201.35.16%201.13%201.06.43c.43.18.83.41%201.23.71l.91.7%201.06-.43%201.27-.51.7%201.21-1.07.85-.89.7.14%201.13zM12%208c-2.21%200-4%201.79-4%204s1.79%204%204%204%204-1.79%204-4-1.79-4-4-4zm0%206c-1.1%200-2-.9-2-2s.9-2%202-2%202%20.9%202%202-.9%202-2%202z'/%3e%3c/svg%3e";

const shareOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M18%2016.08c-.76%200-1.44.3-1.96.77L8.91%2012.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5%201.25.81%202.04.81%201.66%200%203-1.34%203-3s-1.34-3-3-3-3%201.34-3%203c0%20.24.04.47.09.7L8.04%209.81C7.5%209.31%206.79%209%206%209c-1.66%200-3%201.34-3%203s1.34%203%203%203c.79%200%201.5-.31%202.04-.81l7.12%204.16c-.05.21-.08.43-.08.65%200%201.61%201.31%202.92%202.92%202.92s2.92-1.31%202.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18%204c.55%200%201%20.45%201%201s-.45%201-1%201-1-.45-1-1%20.45-1%201-1zM6%2013c-.55%200-1-.45-1-1s.45-1%201-1%201%20.45%201%201-.45%201-1%201zm12%207.02c-.55%200-1-.45-1-1s.45-1%201-1%201%20.45%201%201-.45%201-1%201z'/%3e%3c/svg%3e";

const skipNextOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m6%2018%208.5-6L6%206v12zm2-8.14L11.03%2012%208%2014.14V9.86zM16%206h2v12h-2z'/%3e%3c/svg%3e";

const skipPreviousOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M6%206h2v12H6zm3.5%206%208.5%206V6l-8.5%206zm6.5%202.14L12.97%2012%2016%209.86v4.28z'/%3e%3c/svg%3e";

const speedOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m20.38%208.57-1.23%201.85a8%208%200%200%201-.22%207.58H5.07A8%208%200%200%201%2015.58%206.85l1.85-1.23A10%2010%200%200%200%203.35%2019a2%202%200%200%200%201.72%201h13.85a2%202%200%200%200%201.74-1%2010%2010%200%200%200-.27-10.44z'/%3e%3cpath%20d='M10.59%2015.41a2%202%200%200%200%202.83%200l5.66-8.49-8.49%205.66a2%202%200%200%200%200%202.83z'/%3e%3c/svg%3e";

const sportsEsportsOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m21.58%2016.09-1.09-7.66A3.996%203.996%200%200%200%2016.53%205H7.47C5.48%205%203.79%206.46%203.51%208.43l-1.09%207.66a2.545%202.545%200%200%200%204.32%202.16L9%2016h6l2.25%202.25c.48.48%201.13.75%201.8.75%201.56%200%202.75-1.37%202.53-2.91zm-2.1.72a.54.54%200%200%201-.42.19c-.15%200-.29-.06-.39-.16L15.83%2014H8.17l-2.84%202.84c-.1.1-.24.16-.39.16a.54.54%200%200%201-.42-.19.52.52%200%200%201-.13-.44l1.09-7.66C5.63%207.74%206.48%207%207.47%207h9.06c.99%200%201.84.74%201.98%201.72l1.09%207.66c.03.2-.05.34-.12.43z'/%3e%3cpath%20d='M9%208H8v2H6v1h2v2h1v-2h2v-1H9z'/%3e%3ccircle%20cx='17'%20cy='12'%20r='1'/%3e%3ccircle%20cx='15'%20cy='9'%20r='1'/%3e%3c/svg%3e";

const starOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%2017.27%2018.18%2021l-1.64-7.03L22%209.24l-7.19-.61L12%202%209.19%208.63%202%209.24l5.46%204.73L5.82%2021%2012%2017.27z'/%3e%3c/svg%3e";

const stopOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16%208v8H8V8h8m2-2H6v12h12V6z'/%3e%3c/svg%3e";

const storageOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M2%2020h20v-4H2v4zm2-3h2v2H4v-2zM2%204v4h20V4H2zm4%203H4V5h2v2zm-4%207h20v-4H2v4zm2-3h2v2H4v-2z'/%3e%3c/svg%3e";

const tabOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M21%203H3c-1.1%200-2%20.9-2%202v14c0%201.1.9%202%202%202h18c1.1%200%202-.9%202-2V5c0-1.1-.9-2-2-2zm0%2016H3V5h10v4h8v10z'/%3e%3c/svg%3e";

const textFieldsOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M2.5%204v3h5v12h3V7h5V4h-13zm19%205h-9v3h3v7h3v-7h3V9z'/%3e%3c/svg%3e";

const thumbUpOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M9%2021h9c.83%200%201.54-.5%201.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17%201%207.58%207.59C7.22%207.95%207%208.45%207%209v10c0%201.1.9%202%202%202zM9%209l4.34-4.34L12%2010h9v2l-3%207H9V9zM1%209h4v12H1z'/%3e%3c/svg%3e";

const timerOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M15%201H9v2h6V1zm-4%2013h2V8h-2v6zm8.03-6.61%201.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42%201.42A8.962%208.962%200%200%200%2012%204c-4.97%200-9%204.03-9%209s4.02%209%209%209a8.994%208.994%200%200%200%207.03-14.61zM12%2020c-3.87%200-7-3.13-7-7s3.13-7%207-7%207%203.13%207%207-3.13%207-7%207z'/%3e%3c/svg%3e";

const titleOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M5%204v3h5.5v12h3V7H19V4H5z'/%3e%3c/svg%3e";

const trendingUpOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='m16%206%202.29%202.29-4.88%204.88-4-4L2%2016.59%203.41%2018l6-6%204%204%206.3-6.29L22%2012V6h-6z'/%3e%3c/svg%3e";

const tvOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M21%203H3c-1.1%200-2%20.9-2%202v12c0%201.1.9%202%202%202h5v2h8v-2h5c1.1%200%201.99-.9%201.99-2L23%205c0-1.1-.9-2-2-2zm0%2014H3V5h18v12z'/%3e%3c/svg%3e";

const updateOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M11%208v5l4.25%202.52.77-1.28-3.52-2.09V8H11zm10%202V3l-2.64%202.64A8.937%208.937%200%200%200%2012%203a9%209%200%201%200%209%209h-2c0%203.86-3.14%207-7%207s-7-3.14-7-7%203.14-7%207-7c1.93%200%203.68.79%204.95%202.05L14%2010h7z'/%3e%3c/svg%3e";

const upgradeOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16%2018v2H8v-2h8zM11%207.99V16h2V7.99h3L12%204%208%207.99h3z'/%3e%3c/svg%3e";

const uploadOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M9%2016h6v-6h4l-7-7-7%207h4v6zm3-10.17L14.17%208H13v6h-2V8H9.83L12%205.83zM5%2018h14v2H5z'/%3e%3c/svg%3e";

const videoLibraryOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M4%206H2v14c0%201.1.9%202%202%202h14v-2H4V6zm16-4H8c-1.1%200-2%20.9-2%202v12c0%201.1.9%202%202%202h12c1.1%200%202-.9%202-2V4c0-1.1-.9-2-2-2zm0%2014H8V4h12v12zM12%205.5v9l6-4.5z'/%3e%3c/svg%3e";

const videocamOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M15%208v8H5V8h10m1-2H4c-.55%200-1%20.45-1%201v10c0%20.55.45%201%201%201h12c.55%200%201-.45%201-1v-3.5l4%204v-11l-4%204V7c0-.55-.45-1-1-1z'/%3e%3c/svg%3e";

const visibilityOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%206a9.77%209.77%200%200%201%208.82%205.5C19.17%2014.87%2015.79%2017%2012%2017s-7.17-2.13-8.82-5.5A9.77%209.77%200%200%201%2012%206m0-2C7%204%202.73%207.11%201%2011.5%202.73%2015.89%207%2019%2012%2019s9.27-3.11%2011-7.5C21.27%207.11%2017%204%2012%204zm0%205a2.5%202.5%200%200%201%200%205%202.5%202.5%200%200%201%200-5m0-2c-2.48%200-4.5%202.02-4.5%204.5S9.52%2016%2012%2016s4.5-2.02%204.5-4.5S14.48%207%2012%207z'/%3e%3c/svg%3e";

const visibilityOffOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%206a9.77%209.77%200%200%201%208.82%205.5%209.647%209.647%200%200%201-2.41%203.12l1.41%201.41c1.39-1.23%202.49-2.77%203.18-4.53C21.27%207.11%2017%204%2012%204c-1.27%200-2.49.2-3.64.57l1.65%201.65C10.66%206.09%2011.32%206%2012%206zm-1.07%201.14L13%209.21c.57.25%201.03.71%201.28%201.28l2.07%202.07c.08-.34.14-.7.14-1.07C16.5%209.01%2014.48%207%2012%207c-.37%200-.72.05-1.07.14zM2.01%203.87l2.68%202.68A11.738%2011.738%200%200%200%201%2011.5C2.73%2015.89%207%2019%2012%2019c1.52%200%202.98-.29%204.32-.82l3.42%203.42%201.41-1.41L3.42%202.45%202.01%203.87zm7.5%207.5%202.61%202.61c-.04.01-.08.02-.12.02a2.5%202.5%200%200%201-2.5-2.5c0-.05.01-.08.01-.13zm-3.4-3.4%201.75%201.75a4.6%204.6%200%200%200-.36%201.78%204.507%204.507%200%200%200%206.27%204.14l.98.98c-.88.24-1.8.38-2.75.38a9.77%209.77%200%200%201-8.82-5.5c.7-1.43%201.72-2.61%202.93-3.53z'/%3e%3c/svg%3e";

const volumeDownOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M16%207.97v8.05c1.48-.73%202.5-2.25%202.5-4.02A4.5%204.5%200%200%200%2016%207.97zM5%209v6h4l5%205V4L9%209H5zm7-.17v6.34L9.83%2013H7v-2h2.83L12%208.83z'/%3e%3c/svg%3e";

const volumeOffOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M4.34%202.93%202.93%204.34%207.29%208.7%207%209H3v6h4l5%205v-6.59l4.18%204.18c-.65.49-1.38.88-2.18%201.11v2.06a8.94%208.94%200%200%200%203.61-1.75l2.05%202.05%201.41-1.41L4.34%202.93zM10%2015.17%207.83%2013H5v-2h2.83l.88-.88L10%2011.41v3.76zM19%2012c0%20.82-.15%201.61-.41%202.34l1.53%201.53c.56-1.17.88-2.48.88-3.87%200-4.28-2.99-7.86-7-8.77v2.06c2.89.86%205%203.54%205%206.71zm-7-8-1.88%201.88L12%207.76zm4.5%208A4.5%204.5%200%200%200%2014%207.97v1.79l2.48%202.48c.01-.08.02-.16.02-.24z'/%3e%3c/svg%3e";

const volumeUpOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M3%209v6h4l5%205V4L7%209H3zm7-.17v6.34L7.83%2013H5v-2h2.83L10%208.83zM16.5%2012A4.5%204.5%200%200%200%2014%207.97v8.05c1.48-.73%202.5-2.25%202.5-4.02zM14%203.23v2.06c2.89.86%205%203.54%205%206.71s-2.11%205.85-5%206.71v2.06c4.01-.91%207-4.49%207-8.77%200-4.28-2.99-7.86-7-8.77z'/%3e%3c/svg%3e";

const warningAmberOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%205.99%2019.53%2019H4.47L12%205.99M12%202%201%2021h22L12%202zm1%2014h-2v2h2v-2zm0-6h-2v4h2v-4z'/%3e%3c/svg%3e";

const whatshotOutlinedIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M11.57%2013.16c-1.36.28-2.17%201.16-2.17%202.41%200%201.34%201.11%202.42%202.49%202.42%202.05%200%203.71-1.66%203.71-3.71%200-1.07-.15-2.12-.46-3.12-.79%201.07-2.2%201.72-3.57%202zM13.5.67s.74%202.65.74%204.8c0%202.06-1.35%203.73-3.41%203.73-2.07%200-3.63-1.67-3.63-3.73l.03-.36C5.21%207.51%204%2010.62%204%2014c0%204.42%203.58%208%208%208s8-3.58%208-8C20%208.61%2017.41%203.8%2013.5.67zM12%2020c-3.31%200-6-2.69-6-6%200-1.53.3-3.04.86-4.43a5.582%205.582%200%200%200%203.97%201.63c2.66%200%204.75-1.83%205.28-4.43A14.77%2014.77%200%200%201%2018%2014c0%203.31-2.69%206-6%206z'/%3e%3c/svg%3e";

const checkCircleFilledIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M12%202C6.48%202%202%206.48%202%2012s4.48%2010%2010%2010%2010-4.48%2010-10S17.52%202%2012%202zm-2%2015-5-5%201.41-1.41L10%2014.17l7.59-7.59L19%208l-9%209z'/%3e%3c/svg%3e";

const refreshFilledIcon = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%3e%3cpath%20d='M17.65%206.35A7.958%207.958%200%200%200%2012%204c-4.42%200-7.99%203.58-7.99%208s3.57%208%207.99%208c3.73%200%206.84-2.55%207.73-6h-2.08A5.99%205.99%200%200%201%2012%2018c-3.31%200-6-2.69-6-6s2.69-6%206-6c1.66%200%203.14.69%204.22%201.78L13%2011h7V4l-2.35%202.35z'/%3e%3c/svg%3e";

const outlinedIconMap = {
  "add": addOutlinedIcon,
  "analytics": analyticsOutlinedIcon,
  "arrow_downward": arrowDownwardOutlinedIcon,
  "arrow_upward": arrowUpwardOutlinedIcon,
  "assignment": assignmentOutlinedIcon,
  "audiotrack": audiotrackOutlinedIcon,
  "backup": backupOutlinedIcon,
  "bar_chart": barChartOutlinedIcon,
  "block": blockOutlinedIcon,
  "bookmark": bookmarkOutlinedIcon,
  "bug_report": bugReportOutlinedIcon,
  "build": buildOutlinedIcon,
  "card_giftcard": cardGiftcardOutlinedIcon,
  "check": checkOutlinedIcon,
  "check_box": checkBoxOutlinedIcon,
  "check_box_outline_blank": checkBoxOutlineBlankOutlinedIcon,
  "check_circle": checkCircleOutlinedIcon,
  "clear": clearOutlinedIcon,
  "clear_all": clearAllOutlinedIcon,
  "close": closeOutlinedIcon,
  "cloud": cloudOutlinedIcon,
  "cloud_download": cloudDownloadOutlinedIcon,
  "cloud_upload": cloudUploadOutlinedIcon,
  "color_lens": colorLensOutlinedIcon,
  "comment": commentOutlinedIcon,
  "content_copy": contentCopyOutlinedIcon,
  "dashboard": dashboardOutlinedIcon,
  "delete": deleteOutlinedIcon,
  "delete_forever": deleteForeverOutlinedIcon,
  "delete_outline": deleteOutlineOutlinedIcon,
  "delete_sweep": deleteSweepOutlinedIcon,
  "download": downloadOutlinedIcon,
  "drive_file_move": driveFileMoveOutlinedIcon,
  "edit": editOutlinedIcon,
  "error": errorOutlinedIcon,
  "expand_less": expandLessOutlinedIcon,
  "expand_more": expandMoreOutlinedIcon,
  "fast_forward": fastForwardOutlinedIcon,
  "fast_rewind": fastRewindOutlinedIcon,
  "favorite": favoriteOutlinedIcon,
  "file_download": fileDownloadOutlinedIcon,
  "file_upload": fileUploadOutlinedIcon,
  "filter_list": filterListOutlinedIcon,
  "first_page": firstPageOutlinedIcon,
  "flash_on": flashOnOutlinedIcon,
  "folder": folderOutlinedIcon,
  "folder_open": folderOpenOutlinedIcon,
  "forward_10": forward10OutlinedIcon,
  "fullscreen": fullscreenOutlinedIcon,
  "fullscreen_exit": fullscreenExitOutlinedIcon,
  "gps_fixed": gpsFixedOutlinedIcon,
  "help": helpOutlinedIcon,
  "history": historyOutlinedIcon,
  "home": homeOutlinedIcon,
  "image": imageOutlinedIcon,
  "info": infoOutlinedIcon,
  "keyboard": keyboardOutlinedIcon,
  "label": labelOutlinedIcon,
  "language": languageOutlinedIcon,
  "lightbulb": lightbulbOutlinedIcon,
  "link": linkOutlinedIcon,
  "list": listOutlinedIcon,
  "live_tv": liveTvOutlinedIcon,
  "lock": lockOutlinedIcon,
  "menu": menuOutlinedIcon,
  "menu_book": menuBookOutlinedIcon,
  "more_horiz": moreHorizOutlinedIcon,
  "more_vert": moreVertOutlinedIcon,
  "movie": movieOutlinedIcon,
  "movie_creation": movieCreationOutlinedIcon,
  "navigate_before": navigateBeforeOutlinedIcon,
  "navigate_next": navigateNextOutlinedIcon,
  "new_releases": newReleasesOutlinedIcon,
  "note": noteOutlinedIcon,
  "notification_important": notificationImportantOutlinedIcon,
  "notifications": notificationsOutlinedIcon,
  "palette": paletteOutlinedIcon,
  "pause": pauseOutlinedIcon,
  "person": personOutlinedIcon,
  "play_arrow": playArrowOutlinedIcon,
  "play_circle": playCircleOutlinedIcon,
  "playlist_add": playlistAddOutlinedIcon,
  "playlist_add_circle": playlistAddCircleOutlinedIcon,
  "public": publicOutlinedIcon,
  "publish": publishOutlinedIcon,
  "push_pin": pushPinOutlinedIcon,
  "radio_button_unchecked": radioButtonUncheckedOutlinedIcon,
  "refresh": refreshOutlinedIcon,
  "repeat": repeatOutlinedIcon,
  "replay_10": replay10OutlinedIcon,
  "rocket_launch": rocketLaunchOutlinedIcon,
  "save": saveOutlinedIcon,
  "schedule": scheduleOutlinedIcon,
  "science": scienceOutlinedIcon,
  "search": searchOutlinedIcon,
  "settings": settingsOutlinedIcon,
  "share": shareOutlinedIcon,
  "skip_next": skipNextOutlinedIcon,
  "skip_previous": skipPreviousOutlinedIcon,
  "speed": speedOutlinedIcon,
  "sports_esports": sportsEsportsOutlinedIcon,
  "star": starOutlinedIcon,
  "stop": stopOutlinedIcon,
  "storage": storageOutlinedIcon,
  "tab": tabOutlinedIcon,
  "text_fields": textFieldsOutlinedIcon,
  "thumb_up": thumbUpOutlinedIcon,
  "timer": timerOutlinedIcon,
  "title": titleOutlinedIcon,
  "trending_up": trendingUpOutlinedIcon,
  "tv": tvOutlinedIcon,
  "update": updateOutlinedIcon,
  "upgrade": upgradeOutlinedIcon,
  "upload": uploadOutlinedIcon,
  "video_library": videoLibraryOutlinedIcon,
  "videocam": videocamOutlinedIcon,
  "visibility": visibilityOutlinedIcon,
  "visibility_off": visibilityOffOutlinedIcon,
  "volume_down": volumeDownOutlinedIcon,
  "volume_off": volumeOffOutlinedIcon,
  "volume_up": volumeUpOutlinedIcon,
  "warning_amber": warningAmberOutlinedIcon,
  "whatshot": whatshotOutlinedIcon
};
const filledIconMap = {
  "check_circle": checkCircleFilledIcon,
  "refresh": refreshFilledIcon
};

const ICONS = {
  clear: "clear_all",
  play: "play_arrow",
  search: "search",
  home: "home",
  bookmark: "bookmark",
  live_tv: "live_tv",
  image: "image",
  tv: "tv"};
const iconSourceMap = {
  filled: filledIconMap,
  outlined: outlinedIconMap,
  round: {},
  sharp: {},
  "two-tone": {}
};
function getIconPath(iconName, style = "outlined") {
  const normalizedStyle = iconSourceMap[style] ? style : "outlined";
  const primaryMap = iconSourceMap[normalizedStyle] ?? iconSourceMap.outlined;
  const iconUrl = primaryMap[iconName] ?? iconSourceMap.outlined[iconName];
  if (!iconUrl) {
    if (typeof console !== "undefined") {
      console.warn(`[material-icons] アイコンが見つかりません: ${style}/${iconName}`);
    }
    return "";
  }
  return iconUrl;
}
function getColorClass(color) {
  const colorMap = {
    white: "icon-white",
    green: "icon-green",
    red: "icon-red",
    dark: "icon-dark",
    default: "icon-outlined"
  };
  return colorMap[color] || colorMap.default;
}
function getSizeClass(size) {
  if (typeof size === "number") {
    return "";
  }
  const sizeClassMap = {
    small: "material-icon-small",
    medium: "",
    large: "material-icon-large"
  };
  return sizeClassMap[size] || "";
}
function createMaterialIcon(iconName, options = {}) {
  const {
    style = "outlined",
    size = "medium",
    color = "default",
    classes = "",
    alt = iconName,
    loading = "lazy"
  } = options;
  const iconPath = getIconPath(iconName, style);
  const colorClass = getColorClass(color);
  const sizeClass = getSizeClass(size);
  const allClasses = ["material-icon", colorClass, sizeClass, classes].filter(Boolean).join(" ");
  const styleAttr = typeof size === "number" ? ` style="width: ${size}px; height: ${size}px;"` : "";
  if (!iconPath) {
    return `<span class="${allClasses} material-icon-missing" role="presentation"${styleAttr}></span>`;
  }
  return `<img class="${allClasses}" src="${iconPath}" alt="${alt}" loading="${loading}"${styleAttr} />`;
}
function hydrateMaterialIconImages(root) {
  if (typeof document === "undefined") {
    return;
  }
  const scope = document;
  scope.querySelectorAll("img[data-icon]").forEach((img) => {
    const iconName = img.dataset.icon;
    if (!iconName) {
      return;
    }
    const requestedStyle = img.dataset.style ?? "outlined";
    const iconUrl = getIconPath(iconName, requestedStyle);
    if (!iconUrl) {
      return;
    }
    if (img.getAttribute("src") !== iconUrl) {
      img.src = iconUrl;
    }
  });
}
const materialIconsStyles = `
  /* マテリアルアイコン基本設定 */
  .material-icon {
    display: inline-block;
    width: var(--icon-size-medium, 20px);
    height: var(--icon-size-medium, 20px);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    vertical-align: middle;
    pointer-events: none; /* ボタン内でのクリックイベント伌のため */
  }

  .material-icon-small {
    width: var(--icon-size-small, 16px);
    height: var(--icon-size-small, 16px);
  }

  .material-icon-large {
    width: var(--icon-size-large, 24px);
    height: var(--icon-size-large, 24px);
  }

  /* 色設定用CSSフィルタ（黒塗りアイコンの色変換用） */
  .icon-white {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  .icon-green {
    filter: brightness(0) saturate(100%) invert(64%) sepia(88%) saturate(3583%) hue-rotate(87deg) brightness(118%) contrast(119%);
  }

  .icon-red {
    filter: brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%);
  }

  .icon-dark {
    filter: brightness(0) saturate(100%) invert(20%) sepia(8%) saturate(7%) hue-rotate(314deg) brightness(96%) contrast(93%);
  }

  /* 基本カラー（outlined版での白色設定） */
  .icon-outlined {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  /* CSS変数定義 */
  :root {
    --icon-size-small: 16px;
    --icon-size-medium: 20px;
    --icon-size-large: 24px;
    --icon-color-default: #ffffff;
    --icon-color-success: #4caf50;
    --icon-color-danger: #f44336;
    --icon-color-dark: #333333;
  }

  /* ボタン内のアイコン調整 */
  .control-btn .material-icon,
  .action-card .material-icon {
    margin: 0;
    vertical-align: middle;
  }

  /* FABアイコン */
  .fab-icon {
    width: 24px;
    height: 24px;
  }

  /* タブアイコン */
  .tab-icon {
    width: 20px;
    height: 20px;
    margin-right: 8px;
  }

  /* comment-filter2互換クラス */
  .cf2-icon {
    display: inline-block;
    vertical-align: middle;
  }

  .cf2-icon-white {
    filter: brightness(0) saturate(100%) invert(100%);
  }

  .material-icon-missing {
    opacity: 0;
  }
`;

function applyWatchHistoryStyles() {
  if (document.getElementById("watch-history-styles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "watch-history-styles";
  style.textContent = `
/* ===== ニコニコ動画視聴履歴拡張 - スタイルシート ===== */

/* リセット・基本設定 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f5f5;
  color: #333;
  line-height: 1.6;
}

/* Material Icons (SVG版) */
${materialIconsStyles}

/* レイアウト */
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 共通ヘッダー用のスペース */
#common-header-container {
  position: relative;
  z-index: 1000;
}

/* アプリケーションヘッダー */
.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: relative;
  z-index: 999;
}

.app-header-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
}

.app-header-title {
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.app-header-icon {
  font-size: 1.8rem;
}

.app-header-actions {
  display: flex;
  gap: 1rem;
}

.main-content {
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
}

/* タブナビゲーション */
.tab-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e0e0e0;
}

.tab-buttons {
  display: flex;
  gap: 1rem;
}

.tab-actions {
  display: flex;
  gap: 1rem;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  color: #333;
  background-color: rgba(0,0,0,0.05);
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

/* 履歴レイアウト */
.history-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
  height: calc(100vh - 200px);
}

.sidebar {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  height: fit-content;
  max-height: 100%;
  overflow-y: auto;
}

.content-area {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 検索セクション */
.search-section {
  margin-bottom: 2rem;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: #999;
  font-size: 20px;
}

.search-clear {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: #999;
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.search-clear:hover {
  opacity: 1;
}

/* セクション */
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
}

/* ソートセクション */
.sort-section {
  margin-bottom: 2rem;
}

.sort-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  background: none;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #666;
  transition: all 0.3s ease;
  justify-content: space-between;
}

.sort-btn:hover {
  border-color: #667eea;
  background-color: rgba(102, 126, 234, 0.05);
}

.sort-btn.active {
  border-color: #667eea;
  color: #667eea;
  background-color: rgba(102, 126, 234, 0.1);
}

.sort-btn .material-icon {
  width: 18px;
  height: 18px;
}

.sort-order-icon {
  width: 16px;
  height: 16px;
  opacity: 0.7;
}

/* フィルタセクション */
.filter-section {
  margin-bottom: 2rem;
}

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-checkbox-item {
  flex-direction: row !important;
  align-items: center;
  gap: 0.5rem !important;
}

.filter-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #555;
}

.filter-checkbox {
  margin-right: 0;
}

.filter-select,
.filter-date {
  padding: 0.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
}

.filter-select:focus,
.filter-date:focus {
  outline: none;
  border-color: #667eea;
}

.date-range {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.date-range-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-range span {
  font-size: 0.9rem;
  color: #666;
  min-width: 20px;
}

/* 統計概要 */
.stats-summary {
  border-top: 2px solid #e0e0e0;
  padding-top: 1.5rem;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.stats-item:last-child {
  border-bottom: none;
}

.stats-label {
  font-size: 0.9rem;
  color: #666;
}

.stats-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

/* コンテンツエリア */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.content-count {
  font-size: 1.1rem;
  font-weight: 500;
  color: #333;
}

.content-actions {
  display: flex;
  gap: 1rem;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

/* 履歴アイテム */
.history-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid #f0f0f0;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.history-item:hover {
  border-color: #667eea;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
  transform: translateY(-2px);
}

.history-thumbnail {
  position: relative;
  width: 160px;
  height: 90px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-duration {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.8rem;
}

.history-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.history-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  flex: 1;
}

.completion-icon {
  font-size: 20px;
  color: #4CAF50;
  flex-shrink: 0;
}

.completion-icon:not(.completed) {
  color: #ccc;
}

.history-meta {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
}

.history-owner,
.history-date {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.history-owner .material-icon,
.history-date .material-icon {
  width: 16px;
  height: 16px;
}

.history-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background-color: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50 0%, #45a049 100%);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
  min-width: 35px;
}

.history-stats {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.85rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stat-item .material-icon {
  width: 16px;
  height: 16px;
}

.history-memo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 3px solid #667eea;
}

.history-memo .material-icon {
  width: 16px;
  height: 16px;
  filter: brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(214deg) brightness(119%) contrast(119%);
}

.memo-text {
  font-size: 0.9rem;
  color: #555;
  line-height: 1.4;
}

/* ローディング・空の状態 */
.loading,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  margin-bottom: 1rem;
}

.empty-icon .material-icon {
  width: 4rem;
  height: 4rem;
  filter: brightness(0) saturate(100%) invert(80%) sepia(6%) saturate(15%) hue-rotate(3deg) brightness(93%) contrast(93%);
}

.empty-state h3 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: #666;
}

.empty-state p {
  color: #999;
  text-align: center;
  max-width: 300px;
}

/* シリーズ・アラート専用のempty-state */
#series-empty-state,
#series-alert-empty-state {
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: #fafafa;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  min-height: 200px;
}

#series-empty-state:not(.hidden),
#series-alert-empty-state:not(.hidden) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
}

.hidden {
  display: none !important;
}

/* 統計レイアウト */
.stats-layout {
  height: calc(100vh - 200px);
  overflow-y: auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.stats-card {
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.stats-card-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 0.5rem;
}

.stats-card-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.stats-metric:last-child {
  border-bottom: none;
}

.stats-metric-label {
  font-size: 1rem;
  color: #666;
}

.stats-metric-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.stats-chart {
  width: 100%;
  height: 200px;
  border-radius: 6px;
}

.creator-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.creator-stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #667eea;
}

.creator-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.creator-name {
  font-weight: 500;
  color: #333;
}

.creator-count {
  font-size: 0.9rem;
  color: #666;
}

.creator-time {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

/* タグクラウド */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  min-height: 150px;
}

.tag-cloud-item {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tag-cloud-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.tag-cloud-item.size-xs {
  font-size: 0.7rem;
  padding: 0.3rem 0.6rem;
}

.tag-cloud-item.size-sm {
  font-size: 0.8rem;
  padding: 0.4rem 0.8rem;
}

.tag-cloud-item.size-md {
  font-size: 1rem;
  padding: 0.5rem 1rem;
}

.tag-cloud-item.size-lg {
  font-size: 1.2rem;
  padding: 0.6rem 1.2rem;
}

.tag-cloud-item.size-xl {
  font-size: 1.4rem;
  padding: 0.7rem 1.4rem;
}

.tag-cloud-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 1rem;
  min-height: 150px;
}

.tag-cloud-empty .material-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  filter: brightness(0) saturate(100%) invert(80%);
}

/* ボタン */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
  background: white;
  color: #333;
  border: 2px solid transparent;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a6fd8;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-icon {
  padding: 0.5rem;
  border-radius: 50%;
  min-width: 40px;
  height: 40px;
  justify-content: center;
}

.btn .material-icon {
  width: 18px;
  height: 18px;
}

/* モーダル */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(3px);
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 10px;
  max-width: 800px;
  width: 90%;
  max-height: 90%;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #e0e0e0;
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  flex: 1;
  margin-right: 1rem;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  color: #666;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background-color: #f0f0f0;
  color: #333;
}

.modal-body {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid #e0e0e0;
}

/* 動画詳細 */
.video-detail-grid {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.video-detail-thumbnail img {
  width: 100%;
  height: auto;
  border-radius: 6px;
}

.video-detail-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-row {
  display: flex;
  gap: 1rem;
}

.info-label {
  font-weight: 500;
  color: #666;
  min-width: 80px;
}

.info-value {
  color: #333;
  flex: 1;
}

.tag {
  display: inline-block;
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  margin-right: 0.5rem;
  margin-bottom: 0.25rem;
}

/* メモ編集 */
.memo-textarea {
  width: 100%;
  min-height: 150px;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.3s ease;
}

.memo-textarea:focus {
  outline: none;
  border-color: #667eea;
}

/* トースト通知 */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toast {
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border-left: 4px solid #4CAF50;
  animation: slideIn 0.3s ease;
}

.toast-error {
  border-left-color: #f44336;
}

.toast-info {
  border-left-color: #2196F3;
}

.toast-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  gap: 1rem;
}

.toast-message {
  color: #333;
  font-size: 0.9rem;
}

.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 0.25rem;
  border-radius: 3px;
  transition: background-color 0.3s ease;
}

.toast-close:hover {
  background-color: #f0f0f0;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* レスポンシブ対応 */
@media (max-width: 1024px) {
  .history-layout {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .sidebar {
    height: auto;
    max-height: none;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .video-detail-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 1rem;
  }
  
  .header-container {
    padding: 0 1rem;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .history-item {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .history-thumbnail {
    width: 100%;
    height: 180px;
  }
  
  .modal-content {
    width: 95%;
  }
}

/* 視聴ログアコーディオン */
.watch-count-item {
  cursor: pointer;
  position: relative;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.watch-count-item:hover {
  background-color: #f5f5f5;
}

.accordion-icon {
  margin-left: 4px;
  transition: transform 0.2s;
}

.watch-logs-accordion {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
  background-color: #f8f9fa;
  border-radius: 4px;
  margin-top: 8px;
}

.watch-logs-accordion.expanded {
  max-height: 400px;
  border: 1px solid #e9ecef;
}

.watch-logs-content {
  padding: 12px;
}

.watch-logs-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 14px;
  padding: 8px;
  text-align: center;
  justify-content: center;
}

.watch-logs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.watch-log-item {
  background-color: #fff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 8px;
  font-size: 14px;
}

.watch-log-item.latest {
  border-color: #007bff;
  background-color: #f8f9ff;
}

.watch-log-item.current-session {
  border-color: #ff6b35;
  background-color: #fff8f6;
}

.watch-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.watch-log-date {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 13px;
}

.latest-badge {
  background-color: #007bff;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 8px;
}

.current-badge {
  background-color: #ff6b35;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: 8px;
}

.watch-log-completion {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.completion-text {
  font-weight: 500;
}

.watch-log-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.progress-bar.small {
  height: 4px;
  flex: 1;
  background-color: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar.small .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745, #20c997);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.current-session-note {
  margin-top: 6px;
  padding: 4px 8px;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  font-size: 12px;
  color: #856404;
  text-align: center;
}

/* スクロールバー */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* お気に入り動画 */
.favorite-videos {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0;
}

.favorite-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background-color: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  border-left: 3px solid #ffbb00;
  transition: all 0.2s ease;
}

.favorite-item:hover {
  background-color: #ffffff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  transform: translateY(-1px);
}

.favorite-rank {
  font-weight: 700;
  color: #ffbb00;
  width: 1.5rem;
  text-align: center;
}

.favorite-thumb {
  width: 48px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
}

.favorite-title {
  flex: 1;
  font-size: 0.9rem;
  color: #333;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.favorite-score {
  font-size: 0.8rem;
  color: #666;
  font-variant-numeric: tabular-nums;
}

.favorite-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 1rem;
  min-height: 150px;
}

.favorite-empty .material-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  filter: brightness(0) saturate(100%) invert(80%);
}

${seriesStyles}
`;
  document.head.appendChild(style);
}
const seriesStyles = `
  /* シリーズレイアウト */
  .series-layout {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .series-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .series-search {
    width: 300px;
  }

  .series-filters {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .series-content-area {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* シリーズアイテム */
  .series-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 16px;
    padding: 20px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    background: #fafafa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    min-height: 200px;
  }

  .series-list:empty {
    display: none;
  }

  .series-item {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .series-item:hover {
    background: #f8f9fa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .series-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .series-header {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .series-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    line-height: 1.4;
  }

  .series-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .series-progress .progress-bar {
    flex: 1;
    height: 6px;
    background: #e0e0e0;
    border-radius: 3px;
    overflow: hidden;
  }

  .series-progress .progress-fill {
    height: 100%;
    background: #4caf50;
    transition: width 0.3s ease;
  }

  .series-progress .progress-text {
    font-size: 12px;
    color: #666;
    min-width: 80px;
    text-align: right;
  }

  .series-meta {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .series-stat {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #666;
  }

  .series-last-video {
    font-size: 12px;
    color: #666;
    line-height: 1.3;
  }

  .last-video-label {
    font-weight: 500;
    margin-right: 4px;
  }

  .last-video-title {
    color: #333;
  }

  /* シリーズアラートレイアウト */
  .series-alert-layout {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .series-alert-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 8px;
  }

  .series-alert-title h2 {
    margin: 0 0 8px 0;
    font-size: 20px;
    color: #333;
  }

  .series-alert-title p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }

  .series-alert-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .series-alert-actions .btn {
    min-width: 140px;
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
  }

  .series-alert-actions .btn-icon {
    min-width: 40px;
    width: 40px;
    height: 40px;
    padding: 0.5rem;
    border-radius: 50%;
  }

  .series-alert-content-area {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* シリーズアラートアイテム */
  .series-alert-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    background: #fafafa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    min-height: 200px;
  }

  .series-alert-list:empty {
    display: none;
  }

  .series-alert-item {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s ease;
  }

  .series-alert-item:hover {
    background: #f8f9fa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .alert-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .alert-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .alert-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0;
    line-height: 1.4;
  }

  .alert-status {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .alert-status.enabled {
    background: #e8f5e8;
    color: #4caf50;
  }

  .alert-status.disabled {
    background: #ffebee;
    color: #f44336;
  }

  .alert-meta {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .alert-stat {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #666;
  }

  .alert-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 12px;
  }

  .btn-danger {
    background: #f44336;
    color: white;
    border: none;
  }

  .btn-danger:hover {
    background: #d32f2f;
  }

  .btn-warning {
    background-color: #ffc107;
    color: #212529;
    border: none;
  }

  .btn-warning:hover {
    background-color: #e0a800;
  }

  .btn-info {
    background-color: #17a2b8;
    color: white;
    border: none;
  }

  .btn-info:hover {
    background-color: #138496;
  }

  .btn-full {
    width: 100%;
    justify-content: center;
  }

  /* ===== 削除機能関連スタイル ===== */

  /* 削除設定セクション */
  .delete-section {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 1rem;
  }

  .delete-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* 条件付き削除グループ */
  .delete-condition-group {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 1rem;
    background: #fafafa;
  }

  .delete-condition-title {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-bottom: 1rem;
  }

  .delete-condition-inputs {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .delete-condition-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .delete-condition-label {
    font-size: 12px;
    font-weight: 600;
    color: #666;
  }

  .delete-condition-input-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .delete-condition-input {
    width: 80px;
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 13px;
    text-align: center;
  }

  .delete-condition-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }

  .delete-condition-suffix {
    font-size: 12px;
    color: #666;
    font-weight: 500;
  }

  /* 履歴項目の削除ボタン */
  .history-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .history-delete-btn {
    opacity: 0;
    transition: opacity 0.2s ease;
    padding: 4px 6px;
    min-width: unset;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .history-item:hover .history-delete-btn {
    opacity: 1;
  }

  .history-delete-btn:hover {
    background-color: #d32f2f !important;
    transform: scale(1.05);
  }

  .alert-stat .overdue {
    color: #dc3545;
    font-weight: 500;
  }

  /* 通知権限モーダル */
  .notification-permission-info {
    padding: 16px;
  }

  .permission-description {
    font-size: 16px;
    color: #333;
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .browser-instructions {
    margin-bottom: 24px;
  }

  .browser-instructions h3 {
    color: #333;
    margin-bottom: 16px;
    font-size: 18px;
    font-weight: 600;
  }

  .browser-tab {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    transition: all 0.3s ease;
  }

  .browser-tab.current-browser {
    background: #e3f2fd;
    border: 2px solid #2196f3;
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
  }

  .browser-tab.current-browser h4 {
    color: #1976d2;
    position: relative;
  }

  .browser-tab.current-browser h4::after {
    content: "（お使いのブラウザ）";
    font-size: 12px;
    color: #2196f3;
    font-weight: normal;
    margin-left: 8px;
  }

  .browser-tab h4 {
    color: #495057;
    margin-bottom: 12px;
    font-size: 16px;
    font-weight: 600;
  }

  .browser-tab ol {
    margin: 12px 0;
    padding-left: 20px;
  }

  .browser-tab li {
    margin-bottom: 8px;
    line-height: 1.5;
  }

  .alternative-method {
    background: #e9ecef;
    border-left: 4px solid #6c757d;
    padding: 12px;
    margin-top: 12px;
    font-size: 14px;
    line-height: 1.4;
  }

  .alternative-method strong {
    color: #495057;
  }

  .permission-test-section {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
  }

  .permission-test-section h3 {
    color: #155724;
    margin-bottom: 12px;
    font-size: 16px;
    font-weight: 600;
  }

  .permission-test-section p {
    color: #155724;
    margin-bottom: 16px;
    line-height: 1.5;
  }

  /* モーダルフォーム */
  .form-group {
    margin-bottom: 16px;
  }

  .form-label {
    display: block;
    margin-bottom: 4px;
    font-weight: 500;
    color: #333;
  }

  .form-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    background: white;
  }

  .form-checkbox {
    margin-right: 8px;
  }

  /* シリーズ詳細 */
  .series-detail-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .series-detail-stats {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .series-videos-header {
    margin: 16px 0 8px 0;
  }

  .series-videos-header h4 {
    margin: 0;
    font-size: 16px;
    color: #333;
  }

  .series-videos-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
  }

  .series-video-item {
    display: flex;
    gap: 12px;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .series-video-item:hover {
    background: #e9ecef;
  }

  .video-thumbnail {
    position: relative;
    width: 80px;
    height: 45px;
    flex-shrink: 0;
  }

  .video-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
  }

  .video-duration {
    position: absolute;
    bottom: 2px;
    right: 2px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 4px;
    border-radius: 2px;
    font-size: 10px;
  }

  .video-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .video-title {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin: 0;
    line-height: 1.3;
  }

  .video-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #666;
  }

  .video-progress-bar {
    height: 3px;
    background: #e0e0e0;
    border-radius: 2px;
    overflow: hidden;
  }

  .video-progress-bar .progress-fill {
    height: 100%;
    background: #4caf50;
    transition: width 0.3s ease;
  }

  .series-videos-empty {
    text-align: center;
    padding: 32px;
    color: #666;
  }

  /* レスポンシブデザイン */
  @media (max-width: 768px) {
    .series-layout,
    .series-alert-layout {
      padding: 16px;
    }

    .series-header,
    .series-alert-header {
      flex-direction: row;
      align-items: stretch;
      gap: 12px;
    }

    .series-search {
      max-width: none;
    }

    .series-filters {
      justify-content: space-between;
    }

    .series-alert-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .series-alert-actions .btn {
      min-width: auto;
      width: 100%;
    }

    .series-list {
      grid-template-columns: 1fr;
    }

    .alert-header {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .alert-meta {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .alert-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .series-video-item {
      flex-direction: column;
      gap: 8px;
    }

    .video-thumbnail {
      width: 100%;
      height: 120px;
    }
  }

/* ===== データベース管理モーダル ===== */
.db-management-section {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.db-management-section h4 {
  margin: 0 0 16px 0;
  color: #495057;
  font-size: 16px;
  font-weight: 600;
}

/* 永続化状態セクション */
.persistence-status {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.persistence-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.persistence-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  width: fit-content;
}

.persistence-badge.persistent {
  background: #28a745;
}

.persistence-badge.temporary {
  background: #ffc107;
  color: #212529;
}

.persistence-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.storage-usage {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.storage-usage-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.storage-usage-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745 0%, #20c997 50%, #ffc107 80%, #dc3545 100%);
  transition: width 0.3s ease;
}

.storage-usage-text {
  font-size: 12px;
  color: #6c757d;
  text-align: right;
}

.persistence-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* マイグレーション状態セクション */
.migration-status {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.migration-progress-container {
  padding: 16px;
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 8px;
}

.migration-progress-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.migration-current-task {
  font-size: 14px;
  color: #1976d2;
  font-weight: 500;
}

.migration-progress-bar {
  width: 100%;
  height: 8px;
  background: #bbdefb;
  border-radius: 4px;
  overflow: hidden;
}

.migration-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1976d2, #42a5f5);
  transition: width 0.3s ease;
}

.migration-progress-text {
  font-size: 12px;
  color: #1976d2;
  text-align: right;
}

.migration-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* バックアップ管理セクション */
.backup-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.backup-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.backup-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.backup-list-header h5 {
  margin: 0;
  color: #495057;
  font-size: 14px;
  font-weight: 600;
}

.backup-list-container {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
}

.backup-list-empty {
  padding: 24px;
  text-align: center;
  color: #6c757d;
  font-size: 14px;
}

.backup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f8f9fa;
}

.backup-item:last-child {
  border-bottom: none;
}

.backup-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.backup-date {
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

.backup-version {
  font-size: 12px;
  color: #6c757d;
}

.backup-actions {
  display: flex;
  gap: 8px;
}

.backup-restore-btn {
  padding: 4px 8px;
  font-size: 12px;
}

.backup-delete-btn {
  padding: 4px 8px;
  font-size: 12px;
}

/* 設定セクション */
.db-management-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #495057;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.setting-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #007bff;
}

.setting-description {
  font-size: 12px;
  color: #6c757d;
  margin-left: 24px;
}

/* モーダルサイズ拡張 */
.modal-content.large {
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

/* シリーズナビゲーション */
.series-navigation {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.series-nav-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.series-nav-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.series-nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
}

.series-nav-btn:hover {
  background: linear-gradient(135deg, #0056b3, #004085);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
}

.series-nav-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
}

.series-nav-btn .material-icon {
  width: 16px;
  height: 16px;
}

/* レスポンシブデザイン（データベース管理） */
@media (max-width: 768px) {
  .db-management-section {
    padding: 16px;
  }
  
  .persistence-actions,
  .migration-actions,
  .backup-actions {
    flex-direction: column;
  }
  
  .persistence-actions .btn,
  .migration-actions .btn,
  .backup-actions .btn {
    width: 100%;
  }
  
  .backup-item {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .backup-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .modal-content.large {
    width: 95%;
    max-width: none;
  }

  /* シリーズナビゲーション（レスポンシブ） */
  .series-navigation {
    margin-top: 12px;
    padding: 12px;
  }
  
  .series-nav-buttons {
    flex-direction: column;
  }
  
  .series-nav-btn {
    width: 100%;
    justify-content: center;
  }
}
`;

class CommonHeader {
  constructor(container, config = {}) {
    this.isFixed = false;
    this.container = typeof container === "string" ? document.getElementById(container) || document.createElement("div") : container;
    this.config = {
      title: "CustomMylist2 Manager",
      showSearch: true,
      showMoreLinks: true,
      enableFixedMode: false,
      ...config
    };
    this.shadowRoot = this.container.attachShadow({ mode: "open" });
    this.init();
  }
  /**
   * ヘッダーを初期化
   */
  init() {
    this.loadTemplate();
    this.setupEventListeners();
    this.applyConfig();
  }
  /**
   * HTMLテンプレートを読み込み
   */
  loadTemplate() {
    this.shadowRoot.innerHTML = `
      <style>
        ${this.getHeaderStyles()}
      </style>
      ${this.getHeaderTemplate()}
    `;
  }
  /**
   * ヘッダーのスタイルを取得
   */
  getHeaderStyles() {
    return `
      /* 共通ヘッダーコンポーネントのスタイル */
      :host {
        display: block;
        position: relative;
        top: var(--header-offset-top, -8px);
        left: var(--header-offset-left, -8px);
        width: 100%;
        margin: 0;
        padding: 0;
      }

      .custom-header {
        background: var(--header-bg-color, #252525);
        color: var(--header-text-color, #fff);
        padding: var(--header-padding, 8px 20px);
        transition: all 0.3s ease;
        height: var(--header-height, 49px);
        font-size: var(--header-font-size, 15px);
        position: relative;
        width: var(--header-width, 100vw);
        box-sizing: border-box;
        margin: 0;
      }

      .custom-header.fixed {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: var(--header-z-index, 9000);
        box-shadow: var(--header-fixed-shadow, 0 2px 5px rgba(0, 0, 0, 0.2));
        height: var(--header-height, 49px);
        font-size: var(--header-font-size, 15px);
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 1200px;
        margin: 0 auto;
      }

      /* ヘッダー左部分 */
      .header-left {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .header-left h1 {
        margin: 0;
        font-size: 1.2em;
      }

      /* 検索部分 */
      .search-container {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-clear-btn {
        position: relative;
        right: -5px;
        background-color: #3498db;
        border: solid 1px #444;
        cursor: pointer;
        padding: 5px;
        color: #666;
      }

      .search-clear-btn:hover {
        color: #333;
      }

      .search-container select,
      .search-container input {
        padding: 5px 10px;
        border: 1px solid #444;
        border-radius: 3px;
        background: #333;
        color: #fff;
      }

      .search-container select {
        margin-right: 10px;
      }

      .search-container button {
        margin-left: 10px;
        background: var(--header-search-btn-bg, #2a88bd);
        color: #ffffff;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .search-container button:hover {
        background: var(--header-search-btn-hover, #3498db);
      }

      /* アイコンボタン専用スタイル */
      .icon-btn {
        background: var(--header-search-btn-bg, #2a88bd);
        color: #ffffff;
        border: none;
        padding: 8px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
      }

      .icon-btn:hover {
        background: var(--header-search-btn-hover, #3498db);
      }

      .clear-btn {
        background: var(--header-clear-btn-bg, #f44336);
        margin-left: 5px;
      }

      .clear-btn:hover {
        background: var(--header-clear-btn-hover, #d32f2f);
      }

      /* リンク部分 */
      .header-links {
        display: flex;
        gap: 15px;
        align-items: center;
      }

      .header-links a {
        color: var(--header-link-color, #fff);
        text-decoration: none;
        font-size: 0.9em;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .header-links a:hover {
        color: var(--header-link-hover, #2196f3);
      }

      .header-links button {
        background: transparent;
        border: none;
        color: var(--header-link-color, #fff);
        font-size: 0.9em;
        cursor: pointer;
        padding: 0;
      }

      .header-links button:hover {
        color: var(--header-link-hover, #2196f3);
      }

      /* ドロップダウンメニュー */
      .more-links {
        position: relative;
      }

      .dropdown-content {
        display: none;
        position: absolute;
        right: 0;
        background-color: #333;
        min-width: 160px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        z-index: 9001;
      }

      .dropdown-content a {
        padding: 12px 16px;
        display: block;
        white-space: nowrap;
      }

      .more-links:hover .dropdown-content {
        display: block;
      }

      /* マテリアルアイコンの統合 */
      ${materialIconsStyles}
    `;
  }
  /**
   * ヘッダーテンプレート
   */
  getHeaderTemplate() {
    return `
      <!-- 共通ヘッダーテンプレート -->
      <header id="customHeader" class="custom-header">
        <div class="header-content">
          <div class="header-left">
            <h1 data-header-title="${this.config.title}">${this.config.title}</h1>
          </div>
          <div class="header-center">
            <div class="search-container">
              <select id="searchOption" data-header-search-select>
                <option value="www+search">キーワード</option>
                <option value="www+tag">タグ</option>
                <option value="www+mylist_search">マイリスト</option>
                <option value="seiga+search">静画</option>
                <option value="live+search">生放送</option>
                <option value="ch+search">チャンネル</option>
                <option value="dic+s/al/t">大百科</option>
              </select>
              <input type="text" id="searchWords" data-header-search-input placeholder="入力して検索…" />
              <button id="searchExec" data-header-search-btn class="icon-btn" title="検索">
                ${createMaterialIcon(ICONS.search, { style: "outlined", color: "white" })}
              </button>
              <button id="searchClear" data-header-clear-btn class="icon-btn clear-btn" title="クリア">
                ${createMaterialIcon(ICONS.clear, { style: "outlined", color: "white" })}
              </button>
            </div>
          </div>
          <div class="header-right">
            <nav class="header-links">
              <a href="https://www.nicovideo.jp/" target="_blank" title="トップ">
                ${createMaterialIcon(ICONS.home, { style: "outlined", color: "white" })}
                トップ
              </a>
              <a href="https://www.nicovideo.jp/video_top" target="_blank" title="動画">
                ${createMaterialIcon(ICONS.play, { style: "outlined", color: "white" })}
                動画
              </a>
              <a href="https://seiga.nicovideo.jp/" target="_blank" title="静画">
                ${createMaterialIcon(ICONS.image, { style: "outlined", color: "white" })}
                静画
              </a>
              <a href="https://live.nicovideo.jp/" target="_blank" title="生放送">
                ${createMaterialIcon(ICONS.live_tv, { style: "outlined", color: "white" })}
                生放送
              </a>
              <a href="https://ch.nicovideo.jp/" target="_blank" title="チャンネル">
                ${createMaterialIcon(ICONS.tv, { style: "outlined", color: "white" })}
                チャンネル
              </a>
              <span class="more-links">
                <button id="moreLinksBtn" data-header-more-btn>その他▼</button>
                <div class="dropdown-content">
                  <a href="https://dic.nicovideo.jp/" target="_blank" title="大百科">
                    大百科
                  </a>
                  <a href="https://jk.nicovideo.jp/" target="_blank" title="実況">
                    実況
                  </a>
                  <a href="https://anime.nicovideo.jp/" target="_blank" title="Nアニメ">
                    Nアニメ
                  </a>
                  <a href="https://www.nicovideo.jp/ranking" target="_blank" title="ランキング">ランキング</a>
                  <a href="https://www.nicovideo.jp/my/history/video" target="_blank" title="マイページ">
                    ${createMaterialIcon(ICONS.bookmark, { style: "outlined", color: "white" })}
                    マイページ
                  </a>
                  <a href="https://www.nicovideo.jp/newarrival" target="_blank" title="新着動画">
                    新着動画
                  </a>
                  <a href="https://www.nicovideo.jp/recent" target="_blank" title="新着コメント">
                    新着コメント
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/mylist2/index.html" target="_blank" title="mylist2">
                    mylist2
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/watch-history/index.html" target="_blank" title="watch-history">
                    watch-history
                  </a>
                  <a href="https://www.nicovideo.jp/cache/" target="_blank" title="キャッシュ">
                    キャッシュ
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/docs/mylist2/index.html" target="_blank" title="mylist2 README">
                    README(ML2)
                  </a>
                  <a href="https://www.nicovideo.jp/local/features/dist/src/docs/comment-filter2/index.html" target="_blank" title="CommentFilter2 README">
                    README(CF2)
                  </a>
                  <a href="https://github.com/roflsunriz/filter-matome" target="_blank" title="filter-matome">
                    filter-matome (GitHub)
                  </a>
                </div>
              </span>
            </nav>
          </div>
        </div>
      </header>
    `;
  }
  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    const searchBtn = this.shadowRoot.querySelector("#searchExec");
    const clearBtn = this.shadowRoot.querySelector("#searchClear");
    if (searchBtn) {
      searchBtn.addEventListener("click", () => this.handleSearch());
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.handleClear());
    }
    const searchInput = this.shadowRoot.querySelector("#searchWords");
    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleSearch();
        }
      });
    }
    if (this.config.enableFixedMode) {
      window.addEventListener("scroll", () => this.handleScroll());
    }
  }
  /**
   * 設定を適用
   */
  applyConfig() {
    const titleElement = this.shadowRoot.querySelector("[data-header-title]");
    if (titleElement && this.config.title) {
      titleElement.textContent = this.config.title;
    }
    const searchContainer = this.shadowRoot.querySelector(".search-container");
    if (searchContainer && !this.config.showSearch) {
      searchContainer.style.display = "none";
    }
    const moreLinks = this.shadowRoot.querySelector(".more-links");
    if (moreLinks && !this.config.showMoreLinks) {
      moreLinks.style.display = "none";
    }
    if (this.config.customLinks && this.config.customLinks.length > 0) {
      this.addCustomLinks();
    }
  }
  /**
   * カスタムリンクを追加
   */
  addCustomLinks() {
    const headerLinks = this.shadowRoot.querySelector(".header-links");
    if (!headerLinks || !this.config.customLinks) return;
    this.config.customLinks.forEach((link) => {
      const linkElement = document.createElement("a");
      linkElement.href = link.url;
      linkElement.textContent = link.text;
      linkElement.target = link.target || "_blank";
      headerLinks.appendChild(linkElement);
    });
  }
  /**
   * 検索処理
   */
  handleSearch() {
    const searchSelect = this.shadowRoot.querySelector("#searchOption");
    const searchInput = this.shadowRoot.querySelector("#searchWords");
    if (!searchSelect || !searchInput || !searchInput.value.trim()) return;
    const searchType = searchSelect.value;
    const searchWords = encodeURIComponent(searchInput.value.trim());
    const baseUrl = "https://www.nicovideo.jp/search";
    let searchUrl;
    switch (searchType) {
      case "www+tag":
        searchUrl = `${baseUrl}/${searchWords}?f_range=0&type=tag`;
        break;
      case "www+mylist_search":
        searchUrl = `https://www.nicovideo.jp/mylist_search/${searchWords}`;
        break;
      case "seiga+search":
        searchUrl = `https://seiga.nicovideo.jp/search/${searchWords}`;
        break;
      case "live+search":
        searchUrl = `https://live.nicovideo.jp/search?keyword=${searchWords}`;
        break;
      case "ch+search":
        searchUrl = `https://ch.nicovideo.jp/search?q=${searchWords}`;
        break;
      case "dic+s/al/t":
        searchUrl = `https://dic.nicovideo.jp/s/al/t/${searchWords}`;
        break;
      default:
        searchUrl = `${baseUrl}/${searchWords}`;
    }
    window.open(searchUrl, "_blank");
  }
  /**
   * 検索クリア処理
   */
  handleClear() {
    const searchInput = this.shadowRoot.querySelector("#searchWords");
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
  }
  /**
   * スクロール処理（固定モード用）
   */
  handleScroll() {
    const header = this.shadowRoot.querySelector(".custom-header");
    if (!header) return;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > 100 && !this.isFixed) {
      header.classList.add("fixed");
      this.isFixed = true;
    } else if (scrollTop <= 100 && this.isFixed) {
      header.classList.remove("fixed");
      this.isFixed = false;
    }
  }
  /**
   * ヘッダーのタイトルを更新
   */
  setTitle(title) {
    this.config.title = title;
    const titleElement = this.shadowRoot.querySelector("[data-header-title]");
    if (titleElement) {
      titleElement.textContent = title;
    }
  }
  /**
   * 固定モードの切り替え
   */
  toggleFixedMode(enabled) {
    this.config.enableFixedMode = enabled;
    if (enabled) {
      window.addEventListener("scroll", () => this.handleScroll());
    } else {
      window.removeEventListener("scroll", () => this.handleScroll());
      const header = this.shadowRoot.querySelector(".custom-header");
      if (header) {
        header.classList.remove("fixed");
        this.isFixed = false;
      }
    }
  }
  /**
   * Shadow DOM のルートを取得（外部からアクセス可能）
   */
  getShadowRoot() {
    return this.shadowRoot;
  }
  /**
   * Shadow DOM内の要素を取得するヘルパーメソッド
   */
  querySelector(selector) {
    return this.shadowRoot.querySelector(selector);
  }
  /**
   * ヘッダーを破棄
   */
  destroy() {
    window.removeEventListener("scroll", () => this.handleScroll());
    this.shadowRoot.innerHTML = "";
  }
}
function createHeader(containerId, config) {
  return new CommonHeader(containerId, config);
}
window.NicoCommon = {
  CommonHeader,
  createHeader
};

var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["NONE"] = 0] = "NONE";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["LOG"] = 2] = "LOG";
  LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
  LogLevel2[LogLevel2["DEBUG"] = 5] = "DEBUG";
  return LogLevel2;
})(LogLevel || {});

class Logger {
  constructor() {
    this.currentLevel = LogLevel.DEBUG;
    this.enabledFiles = /* @__PURE__ */ new Set();
    this.disabledFiles = /* @__PURE__ */ new Set();
    this.initializeLoggerConfig();
  }
  initializeLoggerConfig() {
    this.setLevel(LogLevel.DEBUG);
  }
  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  setLevel(level) {
    this.currentLevel = level;
  }
  getCallerInfo() {
    const error = new Error();
    const stack = error.stack?.split("\n")[3] || "";
    const urlMatch = stack.match(/(?:@|at\s+)https:\/\/www\.nicovideo\.jp\/local\/(.*?\.js:\d+:\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    const localMatch = stack.match(/\((.+?)\)/);
    if (localMatch) {
      const fullPath = localMatch[1].split("/");
      return fullPath[fullPath.length - 1].replace(/:\d+:\d+$/, "");
    }
    return "unknown";
  }
  enableLogging(filePattern) {
    this.enabledFiles.add(filePattern);
  }
  disableLogging(filePattern) {
    this.disabledFiles.add(filePattern);
  }
  shouldLog(filename) {
    const isDisabled = [...this.disabledFiles].some((pattern) => {
      if (pattern === "All") return true;
      return filename.includes(pattern);
    });
    if (isDisabled) {
      return [...this.enabledFiles].some((pattern) => filename.includes(pattern));
    }
    return true;
  }
  _log(level, args) {
    if (this.currentLevel < level) return;
    const filename = this.getCallerInfo();
    if (!this.shouldLog(filename)) return;
    const prefix = `[${filename}]`;
    switch (level) {
      case LogLevel.INFO:
        console.info(prefix, ...args);
        break;
      case LogLevel.LOG:
        console.log(prefix, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, ...args);
        break;
      case LogLevel.ERROR:
        console.error(prefix, ...args);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, ...args);
        break;
    }
  }
  info(...args) {
    this._log(LogLevel.INFO, args);
  }
  log(...args) {
    this._log(LogLevel.LOG, args);
  }
  warn(...args) {
    this._log(LogLevel.WARN, args);
  }
  error(...args) {
    this._log(LogLevel.ERROR, args);
  }
  debug(...args) {
    this._log(LogLevel.DEBUG, args);
  }
  handleError(component, method, error) {
    this.error(`[${component}::${method}] エラーが発生しました:`, error);
    this.debug(component, method, "エラー発生", error);
  }
  measurePerformance(component, method, callback) {
    const start = performance.now();
    try {
      callback();
    } catch (error) {
      this.handleError(component, method, error);
    } finally {
      const end = performance.now();
      this.debug(component, method, `実行時間: ${end - start}ms`);
    }
  }
}
const logger = Logger.getInstance();
window.logger = logger;

class MigrationManager {
  constructor(config) {
    this.migrations = [];
    this.currentProgress = {
      isRunning: false,
      currentMigration: null,
      progress: 0,
      completedCount: 0,
      totalCount: 0,
      error: null
    };
    this.config = {
      autoMigration: true,
      autoPersist: true,
      autoBackup: true,
      backupBeforeMigration: true,
      ...config
    };
    this.initializeMigrations();
  }
  static toErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }
  /**
   * マイグレーション定義を初期化する
   */
  initializeMigrations() {
    this.migrations.push({
      id: "add-series-info",
      fromVersion: 1,
      toVersion: 2,
      description: "視聴履歴にシリーズ情報を追加",
      migrate: this.migrateV1ToV2.bind(this)
    });
    logger.debug(`[MigrationManager] ${this.migrations.length}個のマイグレーションを定義しました`);
  }
  /**
   * v1からv2へのマイグレーション（シリーズ情報追加）
   */
  async migrateV1ToV2(db, transaction) {
    logger.info("[MigrationManager] v1→v2マイグレーション開始: シリーズ情報を追加");
    const store = transaction.objectStore("watchHistory");
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const entries = request.result;
        let processedCount = 0;
        if (entries.length === 0) {
          logger.info("[MigrationManager] マイグレーション対象のデータがありません");
          resolve();
          return;
        }
        entries.forEach((entry) => {
          if (!("series" in entry)) {
            const updatedEntry = {
              ...entry,
              series: null
              // デフォルト値を設定
            };
            const updateRequest = store.put(updatedEntry);
            updateRequest.onsuccess = () => {
              processedCount++;
              if (processedCount === entries.length) {
                logger.info(`[MigrationManager] v1→v2マイグレーション完了: ${processedCount}件のデータを更新`);
                resolve();
              }
            };
            updateRequest.onerror = () => {
              logger.error("[MigrationManager] データ更新エラー:", updateRequest.error);
              reject(new Error(MigrationManager.toErrorMessage(updateRequest.error)));
            };
          } else {
            processedCount++;
            if (processedCount === entries.length) {
              logger.info(`[MigrationManager] v1→v2マイグレーション完了: ${processedCount}件のデータを確認`);
              resolve();
            }
          }
        });
      };
      request.onerror = () => {
        logger.error("[MigrationManager] データ取得エラー:", request.error);
        reject(new Error(MigrationManager.toErrorMessage(request.error)));
      };
    });
  }
  /**
   * 必要なマイグレーションを実行する
   */
  async executeMigrations(db, oldVersion, newVersion) {
    const requiredMigrations = this.migrations.filter(
      (migration) => migration.fromVersion >= oldVersion && migration.toVersion <= newVersion
    );
    if (requiredMigrations.length === 0) {
      logger.info("[MigrationManager] 実行するマイグレーションがありません");
      return;
    }
    logger.info(`[MigrationManager] ${requiredMigrations.length}個のマイグレーションを実行します`);
    this.currentProgress = {
      isRunning: true,
      currentMigration: null,
      progress: 0,
      completedCount: 0,
      totalCount: requiredMigrations.length,
      error: null
    };
    this.dispatchProgressEvent();
    try {
      if (this.config.backupBeforeMigration) {
        await this.createBackup(db);
      }
      for (let i = 0; i < requiredMigrations.length; i++) {
        const migration = requiredMigrations[i];
        this.currentProgress.currentMigration = migration.description;
        this.currentProgress.progress = i / requiredMigrations.length;
        this.dispatchProgressEvent();
        logger.info(`[MigrationManager] マイグレーション実行中: ${migration.description}`);
        const storeNames = ["watchHistory", "seriesAlerts"];
        const transaction = db.transaction(storeNames, "readwrite");
        await migration.migrate(db, transaction);
        this.currentProgress.completedCount++;
        this.currentProgress.progress = (i + 1) / requiredMigrations.length;
        this.dispatchProgressEvent();
      }
      this.currentProgress.isRunning = false;
      this.currentProgress.currentMigration = null;
      this.currentProgress.progress = 1;
      this.dispatchProgressEvent();
      logger.info("[MigrationManager] 全てのマイグレーションが完了しました");
    } catch (error) {
      this.currentProgress.error = error instanceof Error ? error.message : String(error);
      this.currentProgress.isRunning = false;
      this.dispatchProgressEvent();
      logger.error("[MigrationManager] マイグレーション実行エラー:", error);
      throw new Error(String(error));
    }
  }
  /**
   * データベースの永続化を要求する
   */
  async requestPersistence() {
    try {
      if (!("storage" in navigator) || !("persist" in navigator.storage)) {
        return {
          success: false,
          error: "このブラウザはデータベース永続化をサポートしていません"
        };
      }
      const isPersistent = await navigator.storage.persist();
      if (isPersistent) {
        logger.info("[MigrationManager] データベースの永続化に成功しました");
        return { success: true, data: true };
      } else {
        logger.warn("[MigrationManager] データベースの永続化に失敗しました");
        return { success: true, data: false };
      }
    } catch (error) {
      logger.error("[MigrationManager] 永続化要求エラー:", error);
      return {
        success: false,
        error: `永続化要求失敗: ${MigrationManager.toErrorMessage(error)}`
      };
    }
  }
  /**
   * 永続化状態を取得する
   */
  async getPersistenceStatus() {
    try {
      if (!("storage" in navigator)) {
        return {
          success: false,
          error: "このブラウザはStorage APIをサポートしていません"
        };
      }
      const [isPersistent, estimate] = await Promise.all([
        navigator.storage.persisted(),
        navigator.storage.estimate()
      ]);
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const usageRate = quota > 0 ? usage / quota : 0;
      const canPersist = "persist" in navigator.storage;
      const status = {
        isPersistent,
        quota,
        usage,
        usageRate,
        canPersist
      };
      return { success: true, data: status };
    } catch (error) {
      logger.error("[MigrationManager] 永続化状態取得エラー:", error);
      return {
        success: false,
        error: `永続化状態取得失敗: ${MigrationManager.toErrorMessage(error)}`
      };
    }
  }
  /**
   * バックアップを作成する
   */
  async createBackup(db) {
    if (!this.config.autoBackup) return;
    try {
      logger.info("[MigrationManager] バックアップを作成中...");
      const transaction = db.transaction(["watchHistory", "seriesAlerts"], "readonly");
      const watchHistoryStore = transaction.objectStore("watchHistory");
      const seriesAlertsStore = transaction.objectStore("seriesAlerts");
      const [watchHistory, seriesAlerts] = await Promise.all([
        new Promise((resolve, reject) => {
          const request = watchHistoryStore.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error(MigrationManager.toErrorMessage(request.error)));
        }),
        new Promise((resolve, reject) => {
          const request = seriesAlertsStore.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error(MigrationManager.toErrorMessage(request.error)));
        })
      ]);
      const backup = {
        version: db.version,
        timestamp: Date.now(),
        entries: watchHistory,
        seriesAlerts
      };
      const backupKey = `watch-history-backup-${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));
      this.cleanupOldBackups();
      logger.info("[MigrationManager] バックアップを作成しました:", backupKey);
    } catch (error) {
      logger.error("[MigrationManager] バックアップ作成エラー:", error);
    }
  }
  /**
   * 古いバックアップを削除する
   */
  cleanupOldBackups() {
    try {
      const backupKeys = Object.keys(localStorage).filter((key) => key.startsWith("watch-history-backup-")).sort((a, b) => {
        const timestampA = parseInt(a.split("-").pop() || "0");
        const timestampB = parseInt(b.split("-").pop() || "0");
        return timestampB - timestampA;
      });
      backupKeys.slice(5).forEach((key) => {
        localStorage.removeItem(key);
        logger.debug(`[MigrationManager] 古いバックアップを削除: ${key}`);
      });
    } catch (error) {
      logger.error("[MigrationManager] バックアップ削除エラー:", error);
    }
  }
  /**
   * マイグレーション進捗イベントを発行する
   */
  dispatchProgressEvent() {
    const event = new CustomEvent("migrationProgress", {
      detail: { ...this.currentProgress }
    });
    document.dispatchEvent(event);
  }
  /**
   * 現在のマイグレーション進捗を取得する
   */
  getMigrationProgress() {
    return { ...this.currentProgress };
  }
  /**
   * マイグレーション設定を取得する
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * マイグレーション設定を更新する
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info("[MigrationManager] 設定を更新しました:", this.config);
  }
  /**
   * 利用可能なバックアップ一覧を取得する
   */
  getAvailableBackups() {
    try {
      const backups = Object.keys(localStorage).filter((key) => key.startsWith("watch-history-backup-")).map((key) => {
        try {
          const backup = JSON.parse(localStorage.getItem(key) || "{}");
          return {
            key,
            timestamp: typeof backup.timestamp === "number" ? backup.timestamp : 0,
            version: typeof backup.version === "number" ? backup.version : 0
          };
        } catch {
          return null;
        }
      }).filter((backup) => backup !== null).sort((a, b) => b.timestamp - a.timestamp);
      return backups;
    } catch (error) {
      logger.error("[MigrationManager] バックアップ一覧取得エラー:", error);
      return [];
    }
  }
  /**
   * バックアップからリストアする
   */
  async restoreFromBackup(backupKey) {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        return { success: false, error: "バックアップデータが見つかりません" };
      }
      const backup = JSON.parse(backupData);
      logger.info("[MigrationManager] バックアップからリストア中...", backupKey);
      const request = indexedDB.open("NicoWatchHistory", backup.version);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(["watchHistory", "seriesAlerts"], "readwrite");
          const watchHistoryStore = transaction.objectStore("watchHistory");
          const seriesAlertsStore = transaction.objectStore("seriesAlerts");
          Promise.all([
            new Promise((resolve2, reject2) => {
              const clearRequest = watchHistoryStore.clear();
              clearRequest.onsuccess = () => resolve2();
              clearRequest.onerror = () => reject2(new Error(MigrationManager.toErrorMessage(clearRequest.error)));
            }),
            new Promise((resolve2, reject2) => {
              const clearRequest = seriesAlertsStore.clear();
              clearRequest.onsuccess = () => resolve2();
              clearRequest.onerror = () => reject2(new Error(MigrationManager.toErrorMessage(clearRequest.error)));
            })
          ]).then(() => {
            const promises = [];
            const entries = backup.entries || backup.watchHistory || [];
            entries.forEach((entry) => {
              promises.push(new Promise((resolve2, reject2) => {
                const addRequest = watchHistoryStore.add(entry);
                addRequest.onsuccess = () => resolve2();
                addRequest.onerror = () => reject2(new Error(MigrationManager.toErrorMessage(addRequest.error)));
              }));
            });
            if (backup.seriesAlerts && Array.isArray(backup.seriesAlerts)) {
              backup.seriesAlerts.forEach((alert) => {
                promises.push(new Promise((resolve2, reject2) => {
                  const addRequest = seriesAlertsStore.add(alert);
                  addRequest.onsuccess = () => resolve2();
                  addRequest.onerror = () => reject2(new Error(MigrationManager.toErrorMessage(addRequest.error)));
                }));
              });
            }
            Promise.all(promises).then(() => {
              logger.info("[MigrationManager] バックアップからのリストアが完了しました");
              resolve({ success: true });
            }).catch((error) => {
              logger.error("[MigrationManager] リストア中にエラーが発生:", error);
              reject(new Error(`リストア失敗: ${MigrationManager.toErrorMessage(error)}`));
            });
          }).catch((error) => {
            logger.error("[MigrationManager] データクリア中にエラーが発生:", error);
            reject(new Error(`データクリア失敗: ${MigrationManager.toErrorMessage(error)}`));
          });
        };
        request.onerror = () => {
          logger.error("[MigrationManager] データベース開放エラー:", request.error);
          reject(new Error(`データベース開放失敗: ${MigrationManager.toErrorMessage(request.error)}`));
        };
      });
    } catch (error) {
      logger.error("[MigrationManager] リストアエラー:", error);
      return { success: false, error: `リストア失敗: ${MigrationManager.toErrorMessage(error)}` };
    }
  }
}
const migrationManager = new MigrationManager();

class WatchHistoryDatabase {
  constructor(config) {
    this.db = null;
    this.config = {
      dbName: config?.dbName || "NicoWatchHistory",
      version: config?.version || 2,
      storeName: config?.storeName || "watchHistory"
    };
  }
  static toErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }
  static normalizeWatchSeconds(value) {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return 0;
    }
    return numeric;
  }
  /**
   * データベースを初期化する
   */
  async initialize() {
    try {
      logger.debug("データベース初期化開始:", { dbName: this.config.dbName, version: this.config.version });
      const request = indexedDB.open(this.config.dbName, this.config.version);
      const initResult = await new Promise((resolve, reject) => {
        request.onerror = () => {
          logger.error("データベース接続失敗");
          reject(new Error("データベース接続失敗"));
        };
        request.onsuccess = () => {
          this.db = request.result;
          logger.debug("データベース初期化成功:", { dbName: this.config.dbName });
          resolve({ success: true });
        };
        request.onupgradeneeded = async (event) => {
          const db = event.target.result;
          const oldVersion = event.oldVersion;
          const newVersion = event.newVersion || this.config.version;
          logger.debug("データベーススキーマ更新:", {
            oldVersion,
            newVersion,
            version: this.config.version
          });
          if (oldVersion === 0) {
            const store = db.createObjectStore(this.config.storeName, {
              keyPath: "videoId"
            });
            logger.debug("新しいストアを作成:", { storeName: this.config.storeName });
            store.createIndex("watchedAt", "watchedAt", { unique: false });
            store.createIndex("ownerId", "ownerId", { unique: false });
            store.createIndex("completed", "completed", { unique: false });
            store.createIndex("firstWatchedAt", "firstWatchedAt", { unique: false });
            store.createIndex("title", "title", { unique: false });
            store.createIndex("seriesId", "series.id", { unique: false });
            const alertStore = db.createObjectStore("seriesAlerts", {
              keyPath: "id"
            });
            logger.debug("シリーズアラートストアを作成");
            alertStore.createIndex("seriesId", "seriesId", { unique: false });
            alertStore.createIndex("enabled", "enabled", { unique: false });
            alertStore.createIndex("nextCheckAt", "nextCheckAt", { unique: false });
            logger.debug("インデックス作成完了");
          } else {
            try {
              if (!db.objectStoreNames.contains(this.config.storeName)) {
                const store = db.createObjectStore(this.config.storeName, {
                  keyPath: "videoId"
                });
                store.createIndex("watchedAt", "watchedAt", { unique: false });
                store.createIndex("ownerId", "ownerId", { unique: false });
                store.createIndex("completed", "completed", { unique: false });
                store.createIndex("firstWatchedAt", "firstWatchedAt", { unique: false });
                store.createIndex("title", "title", { unique: false });
                store.createIndex("seriesId", "series.id", { unique: false });
              }
              if (!db.objectStoreNames.contains("seriesAlerts")) {
                const alertStore = db.createObjectStore("seriesAlerts", {
                  keyPath: "id"
                });
                alertStore.createIndex("seriesId", "seriesId", { unique: false });
                alertStore.createIndex("enabled", "enabled", { unique: false });
                alertStore.createIndex("nextCheckAt", "nextCheckAt", { unique: false });
              }
              await migrationManager.executeMigrations(db, oldVersion, newVersion);
            } catch (error) {
              logger.error("マイグレーション実行エラー:", error);
            }
          }
        };
      });
      if (initResult.success && migrationManager.getConfig().autoPersist) {
        try {
          await migrationManager.requestPersistence();
        } catch (error) {
          logger.warn("永続化自動要求失敗:", error);
        }
      }
      return initResult;
    } catch (error) {
      return { success: false, error: `初期化失敗: ${String(error)}` };
    }
  }
  /**
   * 視聴履歴エントリを保存する（upsert操作）
   */
  async saveEntry(entry) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], "readwrite");
        const store = transaction.objectStore(this.config.storeName);
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        transaction.onerror = () => {
          reject(new Error(`保存失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        transaction.onabort = () => {
          reject(new Error("保存処理が中断されました"));
        };
        const getRequest = store.get(entry.videoId);
        getRequest.onsuccess = () => {
          const existingEntry = getRequest.result;
          if (existingEntry) {
            const updated = {
              ...existingEntry,
              ...entry,
              // watchLogsはマージ
              watchLogs: this.mergeWatchLogs(existingEntry.watchLogs, entry.watchLogs),
              // 初回視聴日時は保持
              firstWatchedAt: existingEntry.firstWatchedAt || entry.firstWatchedAt
            };
            const putRequest = store.put(updated);
            putRequest.onerror = () => {
              reject(new Error(`更新失敗: ${WatchHistoryDatabase.toErrorMessage(putRequest.error)}`));
            };
          } else {
            const putRequest = store.put(entry);
            putRequest.onerror = () => {
              reject(new Error(`追加失敗: ${WatchHistoryDatabase.toErrorMessage(putRequest.error)}`));
            };
          }
        };
        getRequest.onerror = () => {
          reject(new Error(`既存エントリ確認失敗: ${WatchHistoryDatabase.toErrorMessage(getRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `保存失敗: ${String(error)}` };
    }
  }
  /**
   * 個別エントリを取得する
   */
  async getEntry(videoId) {
    if (!this.db) {
      return { success: false, error: "データベースが未初期化です" };
    }
    try {
      const transaction = this.db.transaction([this.config.storeName], "readonly");
      const store = transaction.objectStore(this.config.storeName);
      const result = await new Promise((resolve, reject) => {
        const request = store.get(videoId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });
      if (result) {
        return { success: true, data: result };
      } else {
        return { success: false, error: "動画が見つかりません" };
      }
    } catch (error) {
      return { success: false, error: `取得失敗: ${String(error)}` };
    }
  }
  /**
   * 全エントリを取得する（ソート・フィルタ付き）
   */
  async getAllEntries(sortBy = "watchedAt", sortOrder = "desc", filter) {
    logger.debug("getAllEntries開始:", { sortBy, sortOrder, filter });
    if (!this.db) {
      logger.error("データベース未初期化");
      return { success: false, error: "データベース未初期化" };
    }
    try {
      const transaction = this.db.transaction([this.config.storeName], "readonly");
      const store = transaction.objectStore(this.config.storeName);
      const entries = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });
      logger.debug("データベースからエントリ取得完了:", { totalEntries: entries.length });
      if (entries.length > 0) {
        logger.debug("最初のエントリ:", entries[0]);
      }
      let filteredEntries = entries;
      if (filter) {
        filteredEntries = this.applyFilter(entries, filter);
        logger.debug("フィルタ適用後:", { filteredCount: filteredEntries.length });
      }
      const sortedEntries = this.applySorting(filteredEntries, sortBy, sortOrder);
      logger.debug("getAllEntries完了:", { resultCount: sortedEntries.length });
      return { success: true, data: sortedEntries };
    } catch (error) {
      logger.error("getAllEntriesエラー:", error);
      return { success: false, error: `取得失敗: ${String(error)}` };
    }
  }
  /**
   * 統計データを計算する
   */
  async calculateStats() {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "統計計算用データ取得失敗" };
    }
    const entries = entriesResult.data;
    try {
      const totalVideos = entries.length;
      const totalWatchTime = entries.reduce(
        (sum, entry) => sum + WatchHistoryDatabase.normalizeWatchSeconds(entry.lastPosition),
        0
      );
      const completedCount = entries.filter((entry) => entry.completed).length;
      const completionRate = totalVideos > 0 ? completedCount / totalVideos : 0;
      const dailyStats = this.calculateDailyStats(entries);
      const hourlyStats = this.calculateHourlyStats(entries);
      const creatorStats = this.calculateCreatorStats(entries);
      const stats = {
        totalVideos,
        totalWatchTime,
        completionRate,
        dailyStats,
        hourlyStats,
        creatorStats
      };
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: `統計計算失敗: ${String(error)}` };
    }
  }
  /**
   * データをエクスポートする
   */
  async exportData() {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "エクスポート用データ取得失敗" };
    }
    const seriesAlertsResult = await this.getAllSeriesAlerts();
    const seriesAlerts = seriesAlertsResult.success && seriesAlertsResult.data ? seriesAlertsResult.data : [];
    const exportData = {
      exportedAt: Date.now(),
      version: "2.0.0",
      entries: entriesResult.data,
      seriesAlerts
    };
    return { success: true, data: exportData };
  }
  /**
   * データをインポートする
   */
  async importData(exportData, config) {
    if (!exportData.entries || !Array.isArray(exportData.entries)) {
      return { success: false, error: "不正なデータ形式" };
    }
    let importedCount = 0;
    const maxEntries = config.maxEntries || exportData.entries.length;
    try {
      for (const entry of exportData.entries.slice(0, maxEntries)) {
        const existingEntry = await this.getEntry(entry.videoId);
        if (existingEntry.success && existingEntry.data) {
          if (config.duplicateHandling === "skip") {
            continue;
          } else if (config.duplicateHandling === "overwrite") {
            await this.saveEntry(entry);
            importedCount++;
          } else if (config.duplicateHandling === "merge") {
            const merged = this.mergeEntries(existingEntry.data, entry);
            await this.saveEntry(merged);
            importedCount++;
          }
        } else {
          await this.saveEntry(entry);
          importedCount++;
        }
      }
      if (exportData.seriesAlerts && Array.isArray(exportData.seriesAlerts)) {
        for (const alert of exportData.seriesAlerts) {
          const existingAlert = await this.getSeriesAlert(alert.id);
          if (existingAlert.success && existingAlert.data) {
            if (config.duplicateHandling === "skip") {
              continue;
            } else if (config.duplicateHandling === "overwrite") {
              await this.saveSeriesAlert(alert);
              importedCount++;
            } else if (config.duplicateHandling === "merge") {
              const merged = alert.updatedAt > existingAlert.data.updatedAt ? alert : existingAlert.data;
              await this.saveSeriesAlert(merged);
              importedCount++;
            }
          } else {
            await this.saveSeriesAlert(alert);
            importedCount++;
          }
        }
      }
      return { success: true, data: importedCount };
    } catch (error) {
      return { success: false, error: `インポート失敗: ${String(error)}` };
    }
  }
  // ===== プライベートメソッド =====
  /**
   * 視聴ログをマージする
   */
  mergeWatchLogs(existing, newLogs) {
    const merged = [...existing];
    for (const newLog of newLogs) {
      const existingIndex = merged.findIndex(
        (log) => Math.abs(log.date - newLog.date) < 1e3
        // 1秒以内は同じ視聴とみなす
      );
      if (existingIndex >= 0) {
        merged[existingIndex] = newLog;
      } else {
        merged.push(newLog);
      }
    }
    return merged.sort((a, b) => a.date - b.date);
  }
  /**
   * エントリをマージする
   */
  mergeEntries(existing, newEntry) {
    return {
      ...existing,
      ...newEntry,
      // 重要フィールドは最新の情報を優先
      watchedAt: Math.max(existing.watchedAt, newEntry.watchedAt),
      firstWatchedAt: Math.min(existing.firstWatchedAt, newEntry.firstWatchedAt),
      watchCount: existing.watchCount + newEntry.watchCount,
      watchLogs: this.mergeWatchLogs(existing.watchLogs, newEntry.watchLogs)
    };
  }
  /**
   * フィルタを適用する
   */
  applyFilter(entries, filter) {
    return entries.filter((entry) => {
      const rawSearch = (filter.searchText ?? "").trim().toLowerCase();
      if (rawSearch && rawSearch !== "null" && rawSearch !== "undefined") {
        const searchTargets = [
          entry.title,
          entry.ownerName,
          (entry.tags ?? []).join(" "),
          entry.memo
        ].join(" ").toLowerCase();
        if (!searchTargets.includes(rawSearch)) {
          return false;
        }
      }
      const ownerIdFilter = filter.ownerId && String(filter.ownerId).trim().toLowerCase();
      if (ownerIdFilter && ownerIdFilter !== "null" && ownerIdFilter !== "undefined") {
        if (String(entry.ownerId).toLowerCase() !== ownerIdFilter) {
          return false;
        }
      }
      if (filter.completedOnly && !entry.completed) {
        return false;
      }
      if (filter.dateRange) {
        const watchedAt = entry.watchedAt;
        if (watchedAt < filter.dateRange.start || watchedAt > filter.dateRange.end) {
          return false;
        }
      }
      return true;
    });
  }
  /**
   * ソートを適用する
   */
  applySorting(entries, sortBy, sortOrder) {
    return entries.sort((a, b) => {
      let aValue;
      let bValue;
      switch (sortBy) {
        case "watchedAt":
          aValue = a.watchedAt;
          bValue = b.watchedAt;
          break;
        case "firstWatchedAt":
          aValue = a.firstWatchedAt;
          bValue = b.firstWatchedAt;
          break;
        case "title":
          aValue = a.title;
          bValue = b.title;
          break;
        case "ownerName":
          aValue = a.ownerName;
          bValue = b.ownerName;
          break;
        case "lengthSec":
          aValue = a.lengthSec;
          bValue = b.lengthSec;
          break;
        case "watchCount":
          aValue = a.watchCount;
          bValue = b.watchCount;
          break;
        case "viewCount":
          aValue = a.stats?.viewCount || 0;
          bValue = b.stats?.viewCount || 0;
          break;
        case "commentCount":
          aValue = a.stats?.commentCount || 0;
          bValue = b.stats?.commentCount || 0;
          break;
        case "mylistCount":
          aValue = a.stats?.mylistCount || 0;
          bValue = b.stats?.mylistCount || 0;
          break;
        case "likeCount":
          aValue = a.stats?.likeCount || 0;
          bValue = b.stats?.likeCount || 0;
          break;
        case "uploadedAt":
          aValue = a.stats?.uploadedAt || 0;
          bValue = b.stats?.uploadedAt || 0;
          break;
        default:
          aValue = a.watchedAt;
          bValue = b.watchedAt;
      }
      if (typeof aValue === "string" && typeof bValue === "string") {
        const result = aValue.localeCompare(bValue);
        return sortOrder === "asc" ? result : -result;
      } else {
        const result = aValue - bValue;
        return sortOrder === "asc" ? result : -result;
      }
    });
  }
  /**
   * 日別統計を計算する
   */
  calculateDailyStats(entries) {
    const dailyMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      const date = new Date(entry.watchedAt).toISOString().split("T")[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          watchCount: 0,
          totalWatchTime: 0,
          completedCount: 0
        });
      }
      const stats = dailyMap.get(date);
      stats.watchCount += entry.watchCount;
      stats.totalWatchTime += WatchHistoryDatabase.normalizeWatchSeconds(entry.lastPosition);
      if (entry.completed) {
        stats.completedCount++;
      }
    }
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
  /**
   * 時間帯別統計を計算する
   */
  calculateHourlyStats(entries) {
    const hourlyMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      for (const log of entry.watchLogs) {
        const hour = new Date(log.date).getHours();
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
      }
    }
    const hourlyStats = [];
    for (let hour = 0; hour < 24; hour++) {
      hourlyStats.push({
        hour,
        watchCount: hourlyMap.get(hour) || 0
      });
    }
    return hourlyStats;
  }
  /**
   * 投稿者別統計を計算する
   */
  calculateCreatorStats(entries) {
    const creatorMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      if (!creatorMap.has(entry.ownerId)) {
        creatorMap.set(entry.ownerId, {
          ownerId: entry.ownerId,
          ownerName: entry.ownerName,
          videoCount: 0,
          totalWatchTime: 0
        });
      }
      const stats = creatorMap.get(entry.ownerId);
      stats.videoCount++;
      stats.totalWatchTime += WatchHistoryDatabase.normalizeWatchSeconds(entry.lastPosition);
    }
    return Array.from(creatorMap.values()).sort((a, b) => b.videoCount - a.videoCount);
  }
  // ===== シリーズ関連メソッド =====
  /**
   * シリーズ統計を取得する
   */
  async getSeriesStats(filter) {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "シリーズ統計用データ取得失敗" };
    }
    const entries = entriesResult.data;
    const seriesMap = /* @__PURE__ */ new Map();
    for (const entry of entries) {
      if (!entry.series) continue;
      const seriesId = entry.series.id;
      if (!seriesMap.has(seriesId)) {
        seriesMap.set(seriesId, {
          seriesId,
          seriesTitle: entry.series.title,
          watchedCount: 0,
          totalCount: 0,
          // 実際の総数は不明なので0に設定
          progressRate: 0,
          lastWatchedAt: 0,
          lastVideoId: "",
          lastVideoTitle: ""
        });
      }
      const stats = seriesMap.get(seriesId);
      stats.watchedCount++;
      if (entry.watchedAt > stats.lastWatchedAt) {
        stats.lastWatchedAt = entry.watchedAt;
        stats.lastVideoId = entry.videoId;
        stats.lastVideoTitle = entry.title;
      }
    }
    let seriesStats = Array.from(seriesMap.values());
    if (filter) {
      seriesStats = this.applySeriesFilter(seriesStats, filter);
    }
    return { success: true, data: seriesStats };
  }
  /**
   * シリーズの動画一覧を取得する
   */
  async getSeriesVideos(seriesId) {
    const entriesResult = await this.getAllEntries();
    if (!entriesResult.success || !entriesResult.data) {
      return { success: false, error: "シリーズ動画取得失敗" };
    }
    const seriesVideos = entriesResult.data.filter(
      (entry) => entry.series && entry.series.id === seriesId
    );
    return { success: true, data: seriesVideos };
  }
  /**
   * シリーズアラートを保存する
   */
  async saveSeriesAlert(alert) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["seriesAlerts"], "readwrite");
        const store = transaction.objectStore("seriesAlerts");
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        transaction.onerror = () => {
          reject(new Error(`シリーズアラート保存失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        const putRequest = store.put(alert);
        putRequest.onerror = () => {
          reject(new Error(`シリーズアラート保存失敗: ${WatchHistoryDatabase.toErrorMessage(putRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `シリーズアラート保存失敗: ${String(error)}` };
    }
  }
  /**
   * シリーズアラートを取得する
   */
  async getSeriesAlert(alertId) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      const transaction = this.db.transaction(["seriesAlerts"], "readonly");
      const store = transaction.objectStore("seriesAlerts");
      const result = await new Promise((resolve, reject) => {
        const request = store.get(alertId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });
      if (result) {
        return { success: true, data: result };
      } else {
        return { success: false, error: "シリーズアラートが見つからぬ" };
      }
    } catch (error) {
      return { success: false, error: `シリーズアラート取得失敗: ${String(error)}` };
    }
  }
  /**
   * 全シリーズアラートを取得する
   */
  async getAllSeriesAlerts() {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      const transaction = this.db.transaction(["seriesAlerts"], "readonly");
      const store = transaction.objectStore("seriesAlerts");
      const alerts = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(WatchHistoryDatabase.toErrorMessage(request.error)));
      });
      return { success: true, data: alerts };
    } catch (error) {
      return { success: false, error: `シリーズアラート一覧取得失敗: ${String(error)}` };
    }
  }
  /**
   * シリーズアラートを削除する
   */
  async deleteSeriesAlert(alertId) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["seriesAlerts"], "readwrite");
        const store = transaction.objectStore("seriesAlerts");
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        transaction.onerror = () => {
          reject(new Error(`シリーズアラート削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        const deleteRequest = store.delete(alertId);
        deleteRequest.onerror = () => {
          reject(new Error(`シリーズアラート削除失敗: ${WatchHistoryDatabase.toErrorMessage(deleteRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `シリーズアラート削除失敗: ${String(error)}` };
    }
  }
  // ===== 視聴履歴削除機能 =====
  /**
   * 指定した動画IDの視聴履歴を削除する（個別削除）
   */
  async deleteEntry(videoId) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], "readwrite");
        const store = transaction.objectStore(this.config.storeName);
        transaction.oncomplete = () => {
          resolve({ success: true });
        };
        transaction.onerror = () => {
          reject(new Error(`視聴履歴削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        const deleteRequest = store.delete(videoId);
        deleteRequest.onerror = () => {
          reject(new Error(`視聴履歴削除失敗: ${WatchHistoryDatabase.toErrorMessage(deleteRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `視聴履歴削除失敗: ${String(error)}` };
    }
  }
  /**
   * 全ての視聴履歴を削除する（一括削除）
   */
  async deleteAllEntries() {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], "readwrite");
        const store = transaction.objectStore(this.config.storeName);
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          const deletedCount = countRequest.result;
          const clearRequest = store.clear();
          clearRequest.onsuccess = () => {
            resolve({ success: true, data: deletedCount });
          };
          clearRequest.onerror = () => {
            reject(new Error(`一括削除失敗: ${WatchHistoryDatabase.toErrorMessage(clearRequest.error)}`));
          };
        };
        countRequest.onerror = () => {
          reject(new Error(`件数取得失敗: ${WatchHistoryDatabase.toErrorMessage(countRequest.error)}`));
        };
        transaction.onerror = () => {
          reject(new Error(`一括削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `一括削除失敗: ${String(error)}` };
    }
  }
  /**
   * 条件に一致する視聴履歴を削除する（条件付き削除）
   * @param maxWatchCount 最大視聴回数（この回数以下を削除）
   * @param maxProgressRate 最大進捗率（この進捗率以下を削除、0-100の範囲）
   */
  async deleteEntriesByCondition(maxWatchCount, maxProgressRate) {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    if (maxWatchCount < 0 || maxProgressRate < 0 || maxProgressRate > 100) {
      return { success: false, error: "無効な条件値（視聴回数は0以上、進捗率は0-100の範囲）" };
    }
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.config.storeName], "readwrite");
        const store = transaction.objectStore(this.config.storeName);
        const deletedVideoIds = [];
        transaction.oncomplete = () => {
          resolve({ success: true, data: deletedVideoIds.length });
        };
        transaction.onerror = () => {
          reject(new Error(`条件付き削除失敗: ${WatchHistoryDatabase.toErrorMessage(transaction.error)}`));
        };
        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const entry = cursor.value;
            const lastPosition = WatchHistoryDatabase.normalizeWatchSeconds(entry.lastPosition);
            const progressRate = entry.lengthSec > 0 ? Math.round(lastPosition / entry.lengthSec * 100) : 0;
            if (entry.watchCount <= maxWatchCount && progressRate <= maxProgressRate) {
              deletedVideoIds.push(entry.videoId);
              const deleteRequest = cursor.delete();
              deleteRequest.onerror = () => {
                reject(new Error(`エントリ削除失敗 (${entry.videoId}): ${WatchHistoryDatabase.toErrorMessage(deleteRequest.error)}`));
                return;
              };
            }
            cursor.continue();
          }
        };
        cursorRequest.onerror = () => {
          reject(new Error(`カーソル取得失敗: ${WatchHistoryDatabase.toErrorMessage(cursorRequest.error)}`));
        };
      });
    } catch (error) {
      return { success: false, error: `条件付き削除失敗: ${String(error)}` };
    }
  }
  /**
   * チェックが必要なシリーズアラートを取得する
   */
  async getAlertsToCheck() {
    const alertsResult = await this.getAllSeriesAlerts();
    if (!alertsResult.success || !alertsResult.data) {
      return { success: false, error: "アラート取得失敗" };
    }
    const now = Date.now();
    const alertsToCheck = alertsResult.data.filter(
      (alert) => alert.enabled && alert.nextCheckAt <= now
    );
    return { success: true, data: alertsToCheck };
  }
  /**
   * シリーズフィルタを適用する
   */
  applySeriesFilter(seriesStats, filter) {
    return seriesStats.filter((stats) => {
      if (filter.searchText) {
        const searchText = filter.searchText.toLowerCase();
        if (!stats.seriesTitle.toLowerCase().includes(searchText)) {
          return false;
        }
      }
      if (filter.progressFilter && filter.progressFilter !== "all") {
        switch (filter.progressFilter) {
          case "watching":
            if (stats.watchedCount === 0 || stats.progressRate >= 1) {
              return false;
            }
            break;
          case "completed":
            if (stats.progressRate < 1) {
              return false;
            }
            break;
          case "not_started":
            if (stats.watchedCount > 0) {
              return false;
            }
            break;
        }
      }
      if (filter.dateRange) {
        const lastWatchedAt = stats.lastWatchedAt;
        if (lastWatchedAt < filter.dateRange.start || lastWatchedAt > filter.dateRange.end) {
          return false;
        }
      }
      return true;
    });
  }
  // ===== 永続化・マイグレーション管理メソッド =====
  /**
   * データベースの永続化状態を取得する
   */
  async getPersistenceStatus() {
    return await migrationManager.getPersistenceStatus();
  }
  /**
   * データベースの永続化を要求する
   */
  async requestPersistence() {
    return await migrationManager.requestPersistence();
  }
  /**
   * マイグレーション進捗を取得する
   */
  getMigrationProgress() {
    return migrationManager.getMigrationProgress();
  }
  /**
   * マイグレーション設定を取得する
   */
  getMigrationConfig() {
    return migrationManager.getConfig();
  }
  /**
   * マイグレーション設定を更新する
   */
  updateMigrationConfig(config) {
    migrationManager.updateConfig(config);
  }
  /**
   * 利用可能なバックアップ一覧を取得する
   */
  getAvailableBackups() {
    return migrationManager.getAvailableBackups();
  }
  /**
   * バックアップからリストアする
   */
  async restoreFromBackup(backupKey) {
    return await migrationManager.restoreFromBackup(backupKey);
  }
  /**
   * 手動でマイグレーションを実行する
   */
  async runMigration() {
    if (!this.db) {
      return { success: false, error: "データベース未初期化" };
    }
    try {
      await migrationManager.executeMigrations(this.db, 1, this.config.version);
      return { success: true };
    } catch (error) {
      return { success: false, error: `マイグレーション実行失敗: ${WatchHistoryDatabase.toErrorMessage(error)}` };
    }
  }
}
const watchHistoryDB = new WatchHistoryDatabase();

class WatchHistoryApp {
  constructor() {
    this.entries = [];
    this.filteredEntries = [];
    this.config = {
      sortBy: "watchedAt",
      sortOrder: "desc",
      filter: {},
      pageSize: 50,
      currentPage: 1
    };
    this.stats = null;
    this.selectedEntry = null;
    // シリーズ関連
    this.seriesStats = [];
    this.filteredSeriesStats = [];
    this.seriesFilter = {};
    this.seriesAlerts = [];
    this.selectedSeries = null;
    this.alertCheckInterval = null;
    // データベース管理関連
    this.persistenceStatus = null;
    this.migrationProgress = null;
    this.databaseConfig = null;
    // DOM要素
    this.elements = {};
    this.initializeElements();
    hydrateMaterialIconImages();
    this.setupEventListeners();
    this.loadConfig();
    this.initializeCommonHeader();
    void this.initialize();
    applyWatchHistoryStyles();
  }
  /**
   * 非同期ハンドラをイベントリスナー用に安全にラップする
   */
  guardEvent(handler) {
    return (ev) => {
      try {
        const maybe = handler.call(this, ev);
        if (maybe instanceof Promise) {
          void maybe.catch((error) => {
            logger?.error("[WatchHistory] Event handler error:", error);
          });
        }
      } catch (error) {
        logger?.error("[WatchHistory] Event handler throw:", error);
      }
    };
  }
  /**
   * DOM要素を初期化する
   */
  initializeElements() {
    const elementIds = [
      "search-input",
      "search-clear",
      "history-list",
      "loading",
      "empty-state",
      "content-count",
      "refresh-btn",
      "export-btn",
      "import-btn",
      "import-file",
      "history-tab",
      "stats-tab",
      "history-content",
      "stats-content",
      "filter-completed",
      "filter-owner",
      "filter-date-start",
      "filter-date-end",
      "clear-date-range",
      "delete-all-btn",
      "delete-by-condition-btn",
      "delete-watch-count",
      "delete-progress-rate",
      "stats-total-videos",
      "stats-total-time",
      "stats-completion-rate",
      "stats-detail-total-videos",
      "stats-detail-total-time",
      "stats-detail-completion-rate",
      "daily-chart",
      "hourly-chart",
      "creator-stats",
      "tag-cloud",
      "video-detail-modal",
      "modal-title",
      "modal-video-info",
      "modal-close",
      "modal-open-video",
      "modal-edit-memo",
      "memo-edit-modal",
      "memo-textarea",
      "memo-save",
      "memo-cancel",
      "memo-modal-close",
      "favorite-videos",
      "toast-container",
      // シリーズ関連
      "series-tab",
      "series-content",
      "series-search-input",
      "series-search-clear",
      "series-progress-filter",
      "series-refresh-btn",
      "series-count",
      "series-list",
      "series-loading",
      "series-empty-state",
      // シリーズアラート関連
      "series-alert-tab",
      "series-alert-content",
      "add-series-alert-btn",
      "add-series-alert-btn-empty",
      "series-alert-refresh-btn",
      "series-alert-count",
      "series-alert-list",
      "series-alert-loading",
      "series-alert-empty-state",
      // モーダル関連
      "series-alert-modal",
      "series-alert-modal-close",
      "series-alert-series-select",
      "series-alert-interval-select",
      "series-alert-enabled",
      "series-alert-save",
      "series-alert-cancel",
      "series-detail-modal",
      "series-detail-title",
      "series-detail-modal-close",
      "series-detail-info",
      "series-detail-videos",
      "series-detail-add-alert",
      // データベース管理関連
      "database-management-btn",
      "database-management-modal",
      "db-management-modal-close",
      "persistence-badge",
      "persistence-status-text",
      "storage-usage-fill",
      "storage-usage-text",
      "request-persistence-btn",
      "refresh-persistence-btn",
      "migration-progress-container",
      "migration-current-task",
      "migration-progress-fill",
      "migration-progress-text",
      "run-migration-btn",
      "check-migration-btn",
      "create-backup-btn",
      "refresh-backups-btn",
      "backup-list-container",
      "auto-migration-checkbox",
      "auto-persist-checkbox",
      "auto-backup-checkbox",
      "backup-before-migration-checkbox",
      // 手動アラートチェック
      "manual-alert-check-btn",
      "notification-permission-btn",
      // 通知権限モーダル
      "notification-permission-modal",
      "notification-permission-modal-close",
      "test-notification-after-setup"
    ];
    for (const id of elementIds) {
      const element = document.getElementById(id);
      if (element) {
        this.elements[id] = element;
      }
    }
  }
  /**
   * イベントリスナーを設定する
   */
  setupEventListeners() {
    this.elements["search-input"]?.addEventListener("input", this.guardEvent((ev) => this.handleSearch(ev)));
    this.elements["search-clear"]?.addEventListener("click", this.guardEvent(() => this.clearSearch()));
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.addEventListener("click", this.guardEvent((ev) => this.handleSort(ev)));
    });
    this.elements["filter-completed"]?.addEventListener("change", this.guardEvent(() => this.handleFilter()));
    this.elements["filter-owner"]?.addEventListener("change", this.guardEvent(() => this.handleFilter()));
    this.elements["filter-date-start"]?.addEventListener("change", this.guardEvent(() => this.handleFilter()));
    this.elements["filter-date-end"]?.addEventListener("change", this.guardEvent(() => this.handleFilter()));
    this.elements["clear-date-range"]?.addEventListener("click", this.guardEvent(() => this.clearDateRange()));
    this.elements["refresh-btn"]?.addEventListener("click", this.guardEvent(() => this.refreshData()));
    this.elements["export-btn"]?.addEventListener("click", this.guardEvent(() => this.handleExport()));
    this.elements["import-btn"]?.addEventListener("click", this.guardEvent(() => this.handleImport()));
    this.elements["import-file"]?.addEventListener("change", this.guardEvent((ev) => this.handleImportFile(ev)));
    this.elements["delete-all-btn"]?.addEventListener("click", this.guardEvent(() => this.deleteAllHistoryEntries()));
    this.elements["delete-by-condition-btn"]?.addEventListener("click", this.guardEvent(() => this.handleConditionalDelete()));
    this.elements["history-tab"]?.addEventListener("click", this.guardEvent(() => {
      this.switchTab("history");
    }));
    this.elements["stats-tab"]?.addEventListener("click", this.guardEvent(() => {
      this.switchTab("stats");
    }));
    this.elements["series-tab"]?.addEventListener("click", this.guardEvent(() => {
      this.switchTab("series");
    }));
    this.elements["series-alert-tab"]?.addEventListener("click", this.guardEvent(() => {
      this.switchTab("series-alert");
    }));
    this.elements["modal-close"]?.addEventListener("click", this.guardEvent(() => this.closeModal()));
    this.elements["modal-open-video"]?.addEventListener("click", this.guardEvent(() => this.openVideo()));
    this.elements["modal-edit-memo"]?.addEventListener("click", this.guardEvent(() => this.openMemoEdit()));
    this.elements["memo-modal-close"]?.addEventListener("click", this.guardEvent(() => this.closeMemoEdit()));
    this.elements["memo-save"]?.addEventListener("click", this.guardEvent(() => this.saveMemo()));
    this.elements["memo-cancel"]?.addEventListener("click", this.guardEvent(() => this.closeMemoEdit()));
    this.elements["video-detail-modal"]?.addEventListener("click", this.guardEvent((e) => {
      if (e.target === this.elements["video-detail-modal"]) {
        this.closeModal();
      }
    }));
    this.elements["memo-edit-modal"]?.addEventListener("click", this.guardEvent((e) => {
      if (e.target === this.elements["memo-edit-modal"]) {
        this.closeMemoEdit();
      }
    }));
    this.elements["series-search-input"]?.addEventListener("input", this.guardEvent((ev) => this.handleSeriesSearch(ev)));
    this.elements["series-search-clear"]?.addEventListener("click", this.guardEvent(() => this.clearSeriesSearch()));
    this.elements["series-progress-filter"]?.addEventListener("change", this.guardEvent(() => this.handleSeriesFilter()));
    this.elements["series-refresh-btn"]?.addEventListener("click", this.guardEvent(() => this.refreshSeriesData()));
    this.elements["add-series-alert-btn"]?.addEventListener("click", this.guardEvent(() => this.openSeriesAlertModal()));
    this.elements["add-series-alert-btn-empty"]?.addEventListener("click", this.guardEvent(() => this.openSeriesAlertModal()));
    this.elements["series-alert-refresh-btn"]?.addEventListener("click", this.guardEvent(() => this.refreshSeriesAlertData()));
    this.elements["manual-alert-check-btn"]?.addEventListener("click", this.guardEvent(() => this.manualCheckAlerts()));
    this.elements["notification-permission-btn"]?.addEventListener("click", this.guardEvent(() => this.checkNotificationPermission()));
    this.elements["series-alert-modal-close"]?.addEventListener("click", this.guardEvent(() => this.closeSeriesAlertModal()));
    this.elements["series-alert-save"]?.addEventListener("click", this.guardEvent(() => this.saveSeriesAlert()));
    this.elements["series-alert-cancel"]?.addEventListener("click", this.guardEvent(() => this.closeSeriesAlertModal()));
    this.elements["series-detail-modal-close"]?.addEventListener("click", this.guardEvent(() => this.closeSeriesDetailModal()));
    this.elements["series-detail-add-alert"]?.addEventListener("click", this.guardEvent(() => this.addAlertFromSeriesDetail()));
    this.elements["series-alert-modal"]?.addEventListener("click", this.guardEvent((e) => {
      if (e.target === this.elements["series-alert-modal"]) {
        this.closeSeriesAlertModal();
      }
    }));
    this.elements["series-detail-modal"]?.addEventListener("click", this.guardEvent((e) => {
      if (e.target === this.elements["series-detail-modal"]) {
        this.closeSeriesDetailModal();
      }
    }));
    this.elements["database-management-btn"]?.addEventListener("click", this.guardEvent(() => this.openDatabaseManagementModal()));
    this.elements["db-management-modal-close"]?.addEventListener("click", this.guardEvent(() => this.closeDatabaseManagementModal()));
    this.elements["request-persistence-btn"]?.addEventListener("click", this.guardEvent(() => this.requestPersistence()));
    this.elements["refresh-persistence-btn"]?.addEventListener("click", this.guardEvent(() => this.refreshPersistenceStatus()));
    this.elements["run-migration-btn"]?.addEventListener("click", this.guardEvent(() => this.runMigration()));
    this.elements["check-migration-btn"]?.addEventListener("click", this.guardEvent(() => this.checkMigrationStatus()));
    this.elements["create-backup-btn"]?.addEventListener("click", this.guardEvent(() => this.createBackup()));
    this.elements["refresh-backups-btn"]?.addEventListener("click", this.guardEvent(() => this.refreshBackupList()));
    this.elements["auto-migration-checkbox"]?.addEventListener("change", this.guardEvent(() => this.updateDatabaseConfig()));
    this.elements["auto-persist-checkbox"]?.addEventListener("change", this.guardEvent(() => this.updateDatabaseConfig()));
    this.elements["auto-backup-checkbox"]?.addEventListener("change", this.guardEvent(() => this.updateDatabaseConfig()));
    this.elements["backup-before-migration-checkbox"]?.addEventListener("change", this.guardEvent(() => this.updateDatabaseConfig()));
    this.elements["database-management-modal"]?.addEventListener("click", (e) => {
      if (e.target === this.elements["database-management-modal"]) {
        this.closeDatabaseManagementModal();
      }
    });
    this.elements["notification-permission-modal-close"]?.addEventListener("click", this.guardEvent(() => this.closeNotificationPermissionModal()));
    this.elements["test-notification-after-setup"]?.addEventListener("click", this.guardEvent(() => this.testNotificationAfterSetup()));
    this.elements["notification-permission-modal"]?.addEventListener("click", (e) => {
      if (e.target === this.elements["notification-permission-modal"]) {
        this.closeNotificationPermissionModal();
      }
    });
    document.addEventListener("migrationProgress", this.guardEvent((e) => {
      this.handleMigrationProgress(e);
    }));
  }
  /**
   * 設定を読み込む
   */
  loadConfig() {
    const savedConfig = sessionStorage.getItem("watchHistoryConfig");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed && typeof parsed === "object") {
          this.config = { ...this.config, ...parsed };
        }
        const txt = (this.config.filter.searchText ?? "").trim().toLowerCase();
        if (!txt || txt === "null" || txt === "undefined") {
          delete this.config.filter.searchText;
        } else {
          this.config.filter.searchText = txt;
        }
      } catch (error) {
        logger.warn("設定読み込みエラー:", error);
      }
    }
  }
  /**
   * 設定を保存する
   */
  saveConfig() {
    sessionStorage.setItem("watchHistoryConfig", JSON.stringify(this.config));
  }
  /**
   * 共通ヘッダーを初期化する
   */
  initializeCommonHeader() {
    const container = document.getElementById("common-header-container");
    if (container) {
      new CommonHeader(container, {
        title: "watch-history",
        showSearch: true,
        showMoreLinks: true,
        enableFixedMode: false
      });
    }
  }
  /**
   * アプリケーションを初期化する
   */
  async initialize() {
    try {
      this.showLoading(true);
      await watchHistoryDB.initialize();
      await this.loadData();
      this.updateUI();
    } catch (error) {
      logger.error("初期化エラーです:", error);
      this.showToast("初期化に失敗しました", "error");
    } finally {
      this.showLoading(false);
    }
  }
  /**
   * フィルタオブジェクトをサニタイズして返す
   */
  cleanFilter(filter) {
    const cleaned = { ...filter };
    const txt = (cleaned.searchText ?? "").trim();
    if (!txt || txt.toLowerCase() === "null" || txt.toLowerCase() === "undefined") {
      delete cleaned.searchText;
    } else {
      cleaned.searchText = txt;
    }
    if (cleaned.ownerId) {
      const oid = String(cleaned.ownerId).trim();
      if (!oid || oid.toLowerCase() === "null" || oid.toLowerCase() === "undefined") {
        delete cleaned.ownerId;
      } else {
        cleaned.ownerId = oid;
      }
    }
    if (cleaned.dateRange) {
      const { start, end } = cleaned.dateRange;
      if (!start && !end) {
        delete cleaned.dateRange;
      }
    }
    return cleaned;
  }
  /**
   * データを読み込む
   */
  async loadData() {
    try {
      logger.debug("データ読み込み開始");
      logger.debug("getAllEntries呼び出し前:", {
        sortBy: this.config.sortBy,
        sortOrder: this.config.sortOrder,
        filter: this.config.filter
      });
      const sanitizedFilter = this.cleanFilter(this.config.filter);
      this.config.filter = sanitizedFilter;
      const entriesResult = await watchHistoryDB.getAllEntries(
        this.config.sortBy,
        this.config.sortOrder,
        sanitizedFilter
      );
      logger.debug("履歴データ取得結果:", {
        success: entriesResult.success,
        count: entriesResult.data?.length || 0
      });
      if (entriesResult.success && entriesResult.data) {
        this.entries = entriesResult.data;
        this.filterEntries();
      } else {
        logger.warn("履歴データの取得に失敗:", entriesResult);
        this.entries = [];
        this.filterEntries();
      }
      const statsResult = await watchHistoryDB.calculateStats();
      if (statsResult.success && statsResult.data) {
        this.stats = statsResult.data;
      }
      logger.debug("データ読み込み完了");
    } catch (error) {
      logger.error("データ読み込みエラー:", error);
      throw error;
    }
  }
  /**
   * エントリをフィルタリングする
   */
  filterEntries() {
    logger.debug("フィルタリング開始:", {
      totalEntries: this.entries.length,
      filter: this.config.filter
    });
    this.filteredEntries = this.entries.filter((entry) => {
      const filter = this.config.filter;
      const rawSearch = (filter.searchText ?? "").trim().toLowerCase();
      if (rawSearch && rawSearch !== "null" && rawSearch !== "undefined") {
        const searchTargets = [
          entry.title,
          entry.ownerName,
          (entry.tags ?? []).join(" "),
          entry.memo
        ].join(" ").toLowerCase();
        if (!searchTargets.includes(rawSearch)) {
          return false;
        }
      }
      if (filter.ownerId && String(entry.ownerId) !== String(filter.ownerId)) {
        logger.debug("投稿者フィルタで除外:", {
          videoId: entry.videoId,
          title: entry.title,
          entryOwnerId: entry.ownerId,
          entryOwnerIdType: typeof entry.ownerId,
          filterOwnerId: filter.ownerId,
          filterOwnerIdType: typeof filter.ownerId,
          entryOwnerIdString: String(entry.ownerId),
          filterOwnerIdString: String(filter.ownerId),
          isStringEqual: String(entry.ownerId) === String(filter.ownerId)
        });
        return false;
      }
      if (filter.completedOnly && !entry.completed) {
        return false;
      }
      if (filter.dateRange) {
        const watchedAt = entry.watchedAt;
        if (watchedAt < filter.dateRange.start || watchedAt > filter.dateRange.end) {
          return false;
        }
      }
      return true;
    });
    logger.debug("フィルタリング完了:", {
      filteredEntries: this.filteredEntries.length
    });
  }
  /**
   * UIを更新する
   */
  updateUI() {
    this.updateHistoryList();
    this.updateStats();
    this.updateFilters();
    this.updateContentCount();
  }
  /**
   * 履歴リストを更新する
   */
  updateHistoryList() {
    const historyList = this.elements["history-list"];
    if (!historyList) return;
    if (this.filteredEntries.length === 0) {
      historyList.innerHTML = "";
      this.showEmptyState(true);
      return;
    }
    this.showEmptyState(false);
    try {
      const items = this.filteredEntries.map((e) => this.createHistoryItem(e));
      historyList.innerHTML = items.join("");
    } catch (err) {
      logger.error("履歴アイテム生成で例外:", err);
      this.showToast("履歴描画でエラー発生しました", "error");
    }
    historyList.querySelectorAll(".history-item").forEach((item, index) => {
      item.addEventListener("click", this.guardEvent((e) => {
        if (e.target && e.target.closest(".watch-count-item")) {
          return;
        }
        if (e.target && e.target.closest(".history-delete-btn")) {
          return;
        }
        this.showVideoDetail(this.filteredEntries[index]);
      }));
      const deleteBtn = item.querySelector(".history-delete-btn");
      deleteBtn?.addEventListener("click", this.guardEvent((e) => {
        e.stopPropagation();
        void this.deleteHistoryEntry(this.filteredEntries[index]);
      }));
    });
    historyList.querySelectorAll(".watch-count-item").forEach((item) => {
      item.addEventListener("click", this.guardEvent((e) => {
        e.stopPropagation();
        this.toggleWatchLogsAccordion(item);
      }));
    });
  }
  /**
   * 履歴アイテムのHTMLを生成する
   */
  createHistoryItem(entry) {
    const watchedAtDate = new Date(entry.watchedAt);
    let progressPercent = 0;
    if (entry.lengthSec > 0) {
      const rawPercent = entry.lastPosition / entry.lengthSec * 100;
      progressPercent = rawPercent >= 95 ? 100 : Math.min(Math.round(rawPercent), 100);
    }
    const completionIcon = entry.completed ? createMaterialIcon("check_circle", { color: "green", classes: "completion-icon completed" }) : createMaterialIcon("radio_button_unchecked", { color: "default", classes: "completion-icon" });
    return `
      <div class="history-item" data-video-id="${entry.videoId}">
        <div class="history-thumbnail">
          <img src="${entry.thumbnailUrl || "/default-thumbnail.jpg"}" 
               alt="${entry.title}" 
               class="thumbnail-image"
               onerror="this.src='/default-thumbnail.jpg'">
          <div class="video-duration">${this.formatDuration(entry.lengthSec)}</div>
        </div>
        <div class="history-content">
          <div class="history-header">
            <h3 class="history-title">${this.escapeHtml(entry.title)}</h3>
            <div class="history-actions">
              ${completionIcon}
              <button class="history-delete-btn btn btn-sm btn-danger" title="この履歴を削除">
                ${createMaterialIcon("delete", { color: "white", size: "small" })}
              </button>
            </div>
          </div>
          <div class="history-meta">
            <div class="history-owner">
              ${createMaterialIcon("person", { color: "dark", size: "small" })}
              ${this.escapeHtml(entry.ownerName)}
            </div>
            <div class="history-date">
              ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
              ${watchedAtDate.toLocaleDateString("ja-JP")} ${watchedAtDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
            </div>
            ${entry.stats?.uploadedAt ? `
              <div class="history-upload-date">
                ${createMaterialIcon("publish", { color: "dark", size: "small" })}
                投稿: ${new Date(entry.stats.uploadedAt).toLocaleDateString("ja-JP")}
              </div>
            ` : ""}
          </div>
          <div class="history-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <span class="progress-text">${progressPercent}%</span>
          </div>
          <div class="history-stats">
            <div class="stat-item watch-count-item" data-video-id="${entry.videoId}">
              ${createMaterialIcon("repeat", { color: "dark", size: "small" })}
              <span class="watch-count-label">${entry.watchCount}回視聴</span>
              ${createMaterialIcon("expand_more", { color: "dark", size: "small", classes: "accordion-icon" })}
            </div>
            <div class="stat-item">
              ${createMaterialIcon("timer", { color: "dark", size: "small" })}
              <span>${this.formatDuration(entry.lengthSec)}</span>
            </div>
            ${entry.stats?.viewCount ? `
              <div class="stat-item">
                ${createMaterialIcon("visibility", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.viewCount)}</span>
              </div>
            ` : ""}
            ${entry.stats?.commentCount ? `
              <div class="stat-item">
                ${createMaterialIcon("comment", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.commentCount)}</span>
              </div>
            ` : ""}
            ${entry.stats?.mylistCount ? `
              <div class="stat-item">
                ${createMaterialIcon("bookmark", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.mylistCount)}</span>
              </div>
            ` : ""}
            ${entry.stats?.likeCount ? `
              <div class="stat-item">
                ${createMaterialIcon("thumb_up", { color: "dark", size: "small" })}
                <span>${this.formatNumber(entry.stats.likeCount)}</span>
              </div>
            ` : ""}
          </div>
          <div class="watch-logs-accordion" data-video-id="${entry.videoId}">
            <div class="watch-logs-content">
              ${this.createWatchLogsHTML(entry)}
            </div>
          </div>
          ${entry.memo ? `
            <div class="history-memo">
              ${createMaterialIcon("note", { color: "dark", size: "small" })}
              <span class="memo-text">${this.escapeHtml(entry.memo)}</span>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }
  /**
   * 視聴ログの詳細HTMLを作成する
   */
  createWatchLogsHTML(entry) {
    const watchLogs = entry.watchLogs || [];
    const allSessions = [...watchLogs];
    const shouldAddCurrentSession = watchLogs.length === 0 || watchLogs.length > 0 && Math.abs(entry.watchedAt - watchLogs[0].date) > 6e4;
    if (shouldAddCurrentSession) {
      allSessions.unshift({
        date: entry.watchedAt,
        position: entry.lastPosition,
        completed: entry.completed
      });
    }
    if (allSessions.length === 0) {
      return `
        <div class="watch-logs-empty">
          ${createMaterialIcon("info", { color: "dark", size: "small" })}
          <span>視聴記録がありません</span>
        </div>
      `;
    }
    const sortedLogs = [...allSessions].sort((a, b) => b.date - a.date);
    return `
      <div class="watch-logs-list">
        ${sortedLogs.map((log, index) => {
      const logDate = new Date(log.date);
      let progressPercent = 0;
      if (entry.lengthSec > 0) {
        const rawPercent = log.position / entry.lengthSec * 100;
        progressPercent = rawPercent >= 95 ? 100 : Math.min(Math.round(rawPercent), 100);
      }
      const isCurrentSession = shouldAddCurrentSession && index === 0;
      return `
            <div class="watch-log-item ${index === 0 ? "latest" : ""} ${isCurrentSession ? "current-session" : ""}">
              <div class="watch-log-header">
                <div class="watch-log-date">
                  ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
                  <span>${logDate.toLocaleDateString("ja-JP")} ${logDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
                  ${index === 0 ? '<span class="latest-badge">最新</span>' : ""}
                  ${isCurrentSession ? '<span class="current-badge">現在</span>' : ""}
                </div>
                <div class="watch-log-completion">
                  ${log.completed ? createMaterialIcon("check_circle", { color: "green", size: "small" }) : createMaterialIcon("play_circle", { color: "dark", size: "small" })}
                  <span class="completion-text">${log.completed ? "完走" : "途中"}</span>
                </div>
              </div>
              <div class="watch-log-progress">
                <div class="progress-bar small">
                  <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <span class="progress-text">${progressPercent}% (${this.formatDuration(log.position)})</span>
              </div>
              ${isCurrentSession ? `
                <div class="current-session-note">
                  <span>※ 現在の視聴進捗</span>
                </div>
              ` : ""}
            </div>
          `;
    }).join("")}
      </div>
    `;
  }
  /**
   * 視聴ログアコーディオンを切り替える
   */
  toggleWatchLogsAccordion(item) {
    const videoId = item.getAttribute("data-video-id");
    if (!videoId) return;
    const accordion = document.querySelector(`.watch-logs-accordion[data-video-id="${videoId}"]`);
    if (!accordion) return;
    const icon = item.querySelector(".accordion-icon");
    if (!icon) return;
    const isExpanded = accordion.classList.contains("expanded");
    if (isExpanded) {
      accordion.classList.remove("expanded");
      icon.innerHTML = createMaterialIcon("expand_more", { color: "dark", size: "small" });
    } else {
      accordion.classList.add("expanded");
      icon.innerHTML = createMaterialIcon("expand_less", { color: "dark", size: "small" });
    }
  }
  /**
   * 統計を更新する
   */
  updateStats() {
    if (!this.stats) return;
    const totalTime = this.formatDuration(this.stats.totalWatchTime);
    const completionRate = `${Math.round(this.stats.completionRate * 100)}%`;
    if (this.elements["stats-total-videos"]) {
      this.elements["stats-total-videos"].textContent = this.stats.totalVideos.toString();
    }
    if (this.elements["stats-total-time"]) {
      this.elements["stats-total-time"].textContent = totalTime;
    }
    if (this.elements["stats-completion-rate"]) {
      this.elements["stats-completion-rate"].textContent = completionRate;
    }
    if (this.elements["stats-detail-total-videos"]) {
      this.elements["stats-detail-total-videos"].textContent = this.stats.totalVideos.toString();
    }
    if (this.elements["stats-detail-total-time"]) {
      this.elements["stats-detail-total-time"].textContent = totalTime;
    }
    if (this.elements["stats-detail-completion-rate"]) {
      this.elements["stats-detail-completion-rate"].textContent = completionRate;
    }
    this.updateCharts();
    this.updateCreatorStats();
    this.updateTagCloud();
    this.updateFavoriteVideos();
  }
  /**
   * フィルタを更新する
   */
  updateFilters() {
    const ownerSelect = this.elements["filter-owner"];
    if (ownerSelect) {
      logger.debug("投稿者フィルタを更新中:", { entriesCount: this.entries.length });
      const ownersMap = /* @__PURE__ */ new Map();
      this.entries.forEach((entry) => {
        if (entry.ownerId && entry.ownerName) {
          ownersMap.set(entry.ownerId, entry.ownerName);
        }
      });
      logger.debug("投稿者マップ作成完了:", { ownersCount: ownersMap.size });
      const currentValue = ownerSelect.value;
      ownerSelect.innerHTML = '<option value="">すべて</option>';
      const sortedOwners = Array.from(ownersMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
      sortedOwners.forEach(([ownerId, ownerName]) => {
        const option = document.createElement("option");
        option.value = ownerId;
        option.textContent = ownerName;
        ownerSelect.appendChild(option);
      });
      ownerSelect.value = currentValue;
      logger.debug("投稿者フィルタ更新完了:", { currentValue, optionsCount: sortedOwners.length });
    }
  }
  /**
   * コンテンツ数を更新する
   */
  updateContentCount() {
    const contentCount = this.elements["content-count"];
    if (contentCount) {
      contentCount.textContent = `${this.filteredEntries.length} 件の動画`;
    }
  }
  /**
   * グラフを更新する
   */
  updateCharts() {
    if (!this.stats) return;
    const dailyChart = this.elements["daily-chart"];
    if (dailyChart) {
      this.drawDailyChart(dailyChart, this.stats.dailyStats);
    }
    const hourlyChart = this.elements["hourly-chart"];
    if (hourlyChart) {
      this.drawHourlyChart(hourlyChart, this.stats.hourlyStats);
    }
  }
  /**
   * 投稿者統計を更新する
   */
  updateCreatorStats() {
    const creatorStats = this.elements["creator-stats"];
    if (!creatorStats || !this.stats) return;
    const topCreators = this.stats.creatorStats.slice(0, 10);
    const html = topCreators.map((creator) => `
      <div class="creator-stat-item">
        <div class="creator-info">
          <span class="creator-name">${this.escapeHtml(creator.ownerName)}</span>
          <span class="creator-count">${creator.videoCount}本</span>
        </div>
        <div class="creator-time">${this.formatDuration(creator.totalWatchTime)}</div>
      </div>
    `).join("");
    creatorStats.innerHTML = html;
  }
  /**
   * タグ統計を計算する
   */
  calculateTagStats() {
    const tagCounts = /* @__PURE__ */ new Map();
    this.entries.forEach((entry) => {
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach((tag) => {
          if (tag && tag.trim()) {
            const normalizedTag = tag.trim();
            tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
          }
        });
      }
    });
    const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50);
    if (sortedTags.length === 0) {
      return [];
    }
    const maxCount = Math.max(...sortedTags.map(([, count]) => count));
    const minCount = Math.min(...sortedTags.map(([, count]) => count));
    return sortedTags.map(([tag, count]) => {
      let size = "md";
      if (maxCount > minCount) {
        const ratio = (count - minCount) / (maxCount - minCount);
        if (ratio >= 0.8) size = "xl";
        else if (ratio >= 0.6) size = "lg";
        else if (ratio >= 0.4) size = "md";
        else if (ratio >= 0.2) size = "sm";
        else size = "xs";
      }
      return { tag, count, size };
    });
  }
  /**
   * タグクラウドを更新する
   */
  updateTagCloud() {
    const tagCloudElement = this.elements["tag-cloud"];
    if (!tagCloudElement) return;
    const tagStats = this.calculateTagStats();
    if (tagStats.length === 0) {
      tagCloudElement.innerHTML = `
        <div class="tag-cloud-empty">
          ${createMaterialIcon("label", { color: "dark", size: "large" })}
          <span>タグがありません</span>
        </div>
      `;
      return;
    }
    const html = tagStats.map(({ tag, count, size }) => `
      <span class="tag-cloud-item size-${size}" 
            data-tag="${this.escapeHtml(tag)}" 
            data-count="${count}"
            title="${this.escapeHtml(tag)}: ${count}回">
        ${this.escapeHtml(tag)}
      </span>
    `).join("");
    tagCloudElement.innerHTML = html;
    tagCloudElement.querySelectorAll(".tag-cloud-item").forEach((item) => {
      item.addEventListener("click", () => {
        const tag = item.getAttribute("data-tag");
        if (tag) {
          this.searchByTag(tag);
        }
      });
    });
  }
  /**
   * お気に入り動画トップ15を計算する
   */
  calculateFavoriteVideos() {
    const list = this.entries.map((entry) => {
      const logs = Array.isArray(entry.watchLogs) ? entry.watchLogs : [];
      let totalScore = 0;
      if (logs.length > 0) {
        totalScore = logs.reduce((sum, log) => {
          const completionRatio = entry.lengthSec > 0 ? log.completed ? 1 : log.position / entry.lengthSec : 0;
          return sum + completionRatio;
        }, 0);
      } else {
        const ratio = entry.lengthSec > 0 ? entry.lastPosition / entry.lengthSec : 0;
        totalScore = ratio;
      }
      return { entry, score: totalScore };
    });
    return list.sort((a, b) => b.score - a.score).slice(0, 15);
  }
  /**
   * お気に入り動画リストを更新する
   */
  updateFavoriteVideos() {
    const container = this.elements["favorite-videos"];
    if (!container) return;
    const favorites = this.calculateFavoriteVideos();
    if (favorites.length === 0) {
      container.innerHTML = `
        <div class="favorite-empty">
          ${createMaterialIcon("star", { color: "dark", size: "large" })}
          <span>お気に入り動画がありません</span>
        </div>
      `;
      return;
    }
    const html = favorites.map((item, index) => {
      const { entry, score } = item;
      return `
        <div class="favorite-item" data-video-id="${entry.videoId}">
          <span class="favorite-rank">${index + 1}</span>
          <img class="favorite-thumb" src="${entry.thumbnailUrl || "/default-thumbnail.jpg"}" alt="${this.escapeHtml(entry.title)}" onerror="this.src='/default-thumbnail.jpg'">
          <span class="favorite-title">${this.escapeHtml(entry.title)}</span>
          <span class="favorite-score">${score.toFixed(2)}</span>
        </div>
      `;
    }).join("");
    container.innerHTML = html;
    container.querySelectorAll(".favorite-item").forEach((item, idx) => {
      item.addEventListener("click", () => {
        this.showVideoDetail(favorites[idx].entry);
      });
    });
  }
  /**
   * タグで検索する
   */
  searchByTag(tag) {
    this.switchTab("history");
    const searchInput = this.elements["search-input"];
    if (searchInput) {
      searchInput.value = tag;
      this.config.filter.searchText = tag;
      this.filterEntries();
      this.updateHistoryList();
      this.updateContentCount();
      this.saveConfig();
    }
  }
  // ===== イベントハンドラ =====
  /**
   * 検索を処理する
   */
  handleSearch(event) {
    const input = event.target;
    this.config.filter.searchText = input.value.trim() || void 0;
    this.filterEntries();
    this.updateHistoryList();
    this.updateContentCount();
    this.saveConfig();
  }
  /**
   * 検索をクリアする
   */
  clearSearch() {
    const searchInput = this.elements["search-input"];
    if (searchInput) {
      searchInput.value = "";
      this.config.filter.searchText = void 0;
      this.filterEntries();
      this.updateHistoryList();
      this.updateContentCount();
      this.saveConfig();
    }
  }
  /**
   * 期間フィルタを一括クリアする
   */
  clearDateRange() {
    const startDateInput = this.elements["filter-date-start"];
    const endDateInput = this.elements["filter-date-end"];
    if (startDateInput) {
      startDateInput.value = "";
    }
    if (endDateInput) {
      endDateInput.value = "";
    }
    this.config.filter.dateRange = void 0;
    this.filterEntries();
    this.updateHistoryList();
    this.updateContentCount();
    this.saveConfig();
    this.showToast("期間フィルタをクリアしました", "success");
  }
  /**
   * ソートを処理する
   */
  async handleSort(event) {
    const button = event.currentTarget;
    const sortBy = button.dataset.sort;
    if (this.config.sortBy === sortBy) {
      this.config.sortOrder = this.config.sortOrder === "asc" ? "desc" : "asc";
    } else {
      this.config.sortBy = sortBy;
      this.config.sortOrder = "desc";
    }
    this.updateSortUI();
    await this.loadData();
    this.updateUI();
    this.saveConfig();
  }
  /**
   * ソートUIを更新する
   */
  updateSortUI() {
    document.querySelectorAll(".sort-btn").forEach((btn) => {
      btn.classList.remove("active");
      const icon = btn.querySelector(".sort-order-icon");
      if (icon) {
        icon.src = getIconPath("arrow_downward");
      }
    });
    const activeBtn = document.querySelector(`[data-sort="${this.config.sortBy}"]`);
    if (activeBtn) {
      activeBtn.classList.add("active");
      const icon = activeBtn.querySelector(".sort-order-icon");
      if (icon) {
        icon.src = this.config.sortOrder === "asc" ? getIconPath("arrow_upward") : getIconPath("arrow_downward");
      }
    }
  }
  /**
   * フィルタを処理する
   */
  handleFilter() {
    const completedFilter = this.elements["filter-completed"];
    const ownerFilter = this.elements["filter-owner"];
    const dateStartFilter = this.elements["filter-date-start"];
    const dateEndFilter = this.elements["filter-date-end"];
    this.config.filter.completedOnly = completedFilter?.checked ? true : void 0;
    this.config.filter.ownerId = ownerFilter?.value || void 0;
    logger.debug("フィルタ更新:", {
      completedOnly: this.config.filter.completedOnly,
      ownerId: this.config.filter.ownerId,
      ownerName: ownerFilter?.selectedOptions[0]?.textContent
    });
    if (dateStartFilter?.value && dateEndFilter?.value) {
      this.config.filter.dateRange = {
        start: new Date(dateStartFilter.value).getTime(),
        end: new Date(dateEndFilter.value).getTime() + 24 * 60 * 60 * 1e3 - 1
      };
    } else {
      this.config.filter.dateRange = void 0;
    }
    this.filterEntries();
    this.updateHistoryList();
    this.updateContentCount();
    this.saveConfig();
  }
  /**
   * データを更新する
   */
  async refreshData() {
    try {
      this.showLoading(true);
      await this.loadData();
      this.updateUI();
      this.showToast("データを更新しました", "success");
    } catch (error) {
      logger.error("データ更新エラー:", error);
      this.showToast("データ更新に失敗しました", "error");
    } finally {
      this.showLoading(false);
    }
  }
  /**
   * エクスポートを処理する
   */
  async handleExport() {
    try {
      const result = await watchHistoryDB.exportData();
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const now = /* @__PURE__ */ new Date();
        const dateStr = now.toISOString().split("T")[0];
        const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
        a.download = `nico-watch-history-${dateStr}-${timeStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast("エクスポートが完了しました", "success");
      }
    } catch (error) {
      logger.error("エクスポートエラー:", error);
      this.showToast("エクスポートに失敗しました", "error");
    }
  }
  /**
   * インポートを処理する
   */
  handleImport() {
    const fileInput = this.elements["import-file"];
    if (fileInput) {
      fileInput.click();
    }
  }
  /**
   * インポートファイルを処理する
   */
  async handleImportFile(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.seriesAlerts) {
        data.seriesAlerts = [];
      }
      const config = {
        duplicateHandling: "merge",
        maxEntries: 1e4
      };
      const result = await watchHistoryDB.importData(data, config);
      if (result.success && result.data !== void 0) {
        this.showToast(`${result.data}件のデータをインポートしました`, "success");
        await this.refreshData();
        await this.refreshSeriesAlertData();
      }
    } catch (error) {
      logger.error("インポートエラー:", error);
      this.showToast("インポートに失敗しました", "error");
    } finally {
      input.value = "";
    }
  }
  /**
   * タブを切り替える
   */
  switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    this.elements[`${tabName}-tab`]?.classList.add("active");
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });
    this.elements[`${tabName}-content`]?.classList.add("active");
    if (tabName === "stats") {
      setTimeout(() => {
        this.updateCharts();
      }, 100);
    }
    if (tabName === "series") {
      void this.initializeSeriesTab();
    }
    if (tabName === "series-alert") {
      void this.initializeSeriesAlertTab();
    }
  }
  /**
   * 動画詳細を表示する
   */
  showVideoDetail(entry) {
    this.selectedEntry = entry;
    const modalTitle = this.elements["modal-title"];
    if (modalTitle) {
      modalTitle.textContent = entry.title;
    }
    const modalVideoInfo = this.elements["modal-video-info"];
    if (modalVideoInfo) {
      modalVideoInfo.innerHTML = this.createVideoDetailHTML(entry);
    }
    this.elements["video-detail-modal"]?.classList.remove("hidden");
  }
  /**
   * 動画詳細HTMLを作成する
   */
  createVideoDetailHTML(entry) {
    const watchedAtDate = new Date(entry.watchedAt);
    const firstWatchedAtDate = new Date(entry.firstWatchedAt);
    let progressPercent = 0;
    if (entry.lengthSec > 0) {
      const rawPercent = entry.lastPosition / entry.lengthSec * 100;
      progressPercent = rawPercent >= 95 ? 100 : Math.min(Math.round(rawPercent), 100);
    }
    return `
      <div class="video-detail-grid">
        <div class="video-detail-thumbnail">
          <img src="${entry.thumbnailUrl}" alt="${entry.title}" onerror="this.src='/default-thumbnail.jpg'">
        </div>
        <div class="video-detail-info">
          <div class="info-row">
            <span class="info-label">動画ID:</span>
            <span class="info-value">${entry.videoId}</span>
          </div>
          <div class="info-row">
            <span class="info-label">投稿者:</span>
            <span class="info-value">${this.escapeHtml(entry.ownerName)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">再生時間:</span>
            <span class="info-value">${this.formatDuration(entry.lengthSec)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">視聴進捗:</span>
            <span class="info-value">${progressPercent}% (${this.formatDuration(entry.lastPosition)})</span>
          </div>
          <div class="info-row">
            <span class="info-label">視聴回数:</span>
            <span class="info-value">${entry.watchCount}回</span>
          </div>
          <div class="info-row">
            <span class="info-label">初回視聴:</span>
            <span class="info-value">${firstWatchedAtDate.toLocaleString("ja-JP")}</span>
          </div>
          <div class="info-row">
            <span class="info-label">最終視聴:</span>
            <span class="info-value">${watchedAtDate.toLocaleString("ja-JP")}</span>
          </div>
          ${(entry.tags ?? []).length > 0 ? `
            <div class="info-row">
              <span class="info-label">タグ:</span>
              <span class="info-value">${(entry.tags ?? []).map((tag) => `<span class="tag">${this.escapeHtml(tag)}</span>`).join(" ")}</span>
            </div>
          ` : ""}
          ${entry.memo ? `
            <div class="info-row">
              <span class="info-label">メモ:</span>
              <span class="info-value">${this.escapeHtml(entry.memo)}</span>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }
  /**
   * モーダルを閉じる
   */
  closeModal() {
    this.elements["video-detail-modal"]?.classList.add("hidden");
    this.selectedEntry = null;
  }
  /**
   * 動画を開く
   */
  openVideo() {
    if (this.selectedEntry) {
      window.open(`https://www.nicovideo.jp/watch/${this.selectedEntry.videoId}`, "_blank");
    }
  }
  /**
   * メモ編集を開く
   */
  openMemoEdit() {
    if (!this.selectedEntry) return;
    const memoTextarea = this.elements["memo-textarea"];
    if (memoTextarea) {
      memoTextarea.value = this.selectedEntry.memo || "";
    }
    this.elements["memo-edit-modal"]?.classList.remove("hidden");
  }
  /**
   * メモ編集を閉じる
   */
  closeMemoEdit() {
    this.elements["memo-edit-modal"]?.classList.add("hidden");
  }
  /**
   * メモを保存する
   */
  async saveMemo() {
    if (!this.selectedEntry) return;
    const memoTextarea = this.elements["memo-textarea"];
    const memo = memoTextarea?.value || "";
    try {
      this.selectedEntry.memo = memo;
      await watchHistoryDB.saveEntry(this.selectedEntry);
      const entryIndex = this.entries.findIndex((entry) => entry.videoId === this.selectedEntry.videoId);
      if (entryIndex !== -1) {
        this.entries[entryIndex] = { ...this.selectedEntry };
      }
      this.filterEntries();
      this.updateHistoryList();
      this.updateContentCount();
      this.closeMemoEdit();
      this.showVideoDetail(this.selectedEntry);
      this.showToast("メモを保存しました", "success");
    } catch (error) {
      logger.error("メモ保存エラー:", error);
      this.showToast("メモの保存に失敗しました", "error");
    }
  }
  // ===== ユーティリティメソッド =====
  /**
   * 読み込み状態を表示する
   */
  showLoading(show) {
    const loading = this.elements["loading"];
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }
  /**
   * 空の状態を表示する
   */
  showEmptyState(show) {
    const emptyState = this.elements["empty-state"];
    if (emptyState) {
      emptyState.classList.toggle("hidden", !show);
    }
  }
  /**
   * トースト通知を表示する
   */
  showToast(message, type = "info") {
    const toastContainer = this.elements["toast-container"];
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${this.escapeHtml(message)}</span>
        <button class="toast-close">
          ${createMaterialIcon("close", { color: "dark", size: "small" })}
        </button>
      </div>
    `;
    toastContainer.appendChild(toast);
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn?.addEventListener("click", () => {
      toast.remove();
    });
    setTimeout(() => {
      toast.remove();
    }, 5e3);
  }
  /**
   * 日別グラフを描画する
   */
  drawDailyChart(canvas, dailyStats) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const { width, height } = canvas;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    ctx.clearRect(0, 0, width, height);
    if (dailyStats.length === 0) {
      ctx.fillStyle = "#666";
      ctx.textAlign = "center";
      ctx.fillText("データがありません", width / 2, height / 2);
      return;
    }
    const maxCount = Math.max(...dailyStats.map((d) => d.watchCount));
    if (maxCount === 0) return;
    const barWidth = chartWidth / dailyStats.length;
    dailyStats.forEach((stat, index) => {
      const barHeight = stat.watchCount / maxCount * chartHeight;
      const x = padding + index * barWidth;
      const y = height - padding - barHeight;
      ctx.fillStyle = "#4CAF50";
      ctx.fillRect(x, y, barWidth * 0.8, barHeight);
      const labelX = x + barWidth * 0.4;
      const labelY = height - padding / 2;
      ctx.save();
      ctx.translate(labelX, labelY);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(stat.date.split("-")[2], 0, 0);
      ctx.restore();
    });
  }
  /**
   * 時間帯別グラフを描画する
   */
  drawHourlyChart(canvas, hourlyStats) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const { width, height } = canvas;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    ctx.clearRect(0, 0, width, height);
    if (hourlyStats.length === 0) {
      ctx.fillStyle = "#666";
      ctx.textAlign = "center";
      ctx.fillText("データがありません", width / 2, height / 2);
      return;
    }
    const maxCount = Math.max(...hourlyStats.map((h) => h.watchCount));
    if (maxCount === 0) return;
    const barWidth = chartWidth / 24;
    hourlyStats.forEach((stat, index) => {
      const barHeight = stat.watchCount / maxCount * chartHeight;
      const x = padding + index * barWidth;
      const y = height - padding - barHeight;
      ctx.fillStyle = "#2196F3";
      ctx.fillRect(x, y, barWidth * 0.8, barHeight);
      if (index % 2 === 0) {
        ctx.fillStyle = "#333";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(stat.hour.toString(), x + barWidth * 0.4, height - padding / 2);
      }
    });
  }
  /**
   * 期間をフォーマットする
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
  }
  /**
   * 数値をフォーマットする
   */
  formatNumber(num) {
    if (num >= 1e4) {
      return `${Math.floor(num / 1e3)}k`;
    }
    return num.toLocaleString();
  }
  /**
   * HTMLをエスケープする
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  // ===== シリーズ関連メソッド =====
  /**
   * シリーズタブを初期化する
   */
  async initializeSeriesTab() {
    if (this.seriesStats.length === 0) {
      await this.loadSeriesData();
    }
    await this.updateSeriesUI();
  }
  /**
   * シリーズアラートタブを初期化する
   */
  async initializeSeriesAlertTab() {
    if (this.seriesAlerts.length === 0) {
      await this.loadSeriesAlertData();
    }
    this.updateSeriesAlertUI();
    this.startAlertCheck();
    this.startAlertUIUpdater();
    this.checkNotificationPermissionOnTab();
  }
  /**
   * シリーズデータを読み込む
   */
  async loadSeriesData() {
    try {
      this.showSeriesLoading(true);
      const seriesResult = await watchHistoryDB.getSeriesStats(this.seriesFilter);
      if (seriesResult.success && seriesResult.data) {
        this.seriesStats = seriesResult.data;
        this.filterSeriesStats();
      } else {
        this.seriesStats = [];
      }
    } catch (error) {
      logger.error("シリーズデータ読み込みエラー:", error);
      this.showToast("シリーズデータの読み込みに失敗しました", "error");
    } finally {
      this.showSeriesLoading(false);
    }
  }
  /**
   * シリーズアラートデータを読み込む
   */
  async loadSeriesAlertData() {
    try {
      this.showSeriesAlertLoading(true);
      const alertResult = await watchHistoryDB.getAllSeriesAlerts();
      if (alertResult.success && alertResult.data) {
        this.seriesAlerts = alertResult.data;
      } else {
        this.seriesAlerts = [];
      }
    } catch (error) {
      logger.error("シリーズアラートデータ読み込みエラー:", error);
      this.showToast("シリーズアラートデータの読み込みに失敗しました", "error");
    } finally {
      this.showSeriesAlertLoading(false);
    }
  }
  /**
   * シリーズ統計をフィルタリングする
   */
  filterSeriesStats() {
    this.filteredSeriesStats = this.seriesStats.filter((stats) => {
      if (this.seriesFilter.searchText) {
        const searchText = this.seriesFilter.searchText.toLowerCase();
        if (!stats.seriesTitle.toLowerCase().includes(searchText)) {
          return false;
        }
      }
      if (this.seriesFilter.progressFilter && this.seriesFilter.progressFilter !== "all") {
        switch (this.seriesFilter.progressFilter) {
          case "watching":
            if (stats.watchedCount === 0 || stats.progressRate >= 1) {
              return false;
            }
            break;
          case "completed":
            if (stats.progressRate < 1) {
              return false;
            }
            break;
          case "not_started":
            if (stats.watchedCount > 0) {
              return false;
            }
            break;
        }
      }
      return true;
    });
  }
  /**
   * シリーズUIを更新する
   */
  async updateSeriesUI() {
    await this.updateSeriesList();
    this.updateSeriesCount();
  }
  /**
   * シリーズアラートUIを更新する
   */
  updateSeriesAlertUI() {
    this.updateSeriesAlertList();
    this.updateSeriesAlertCount();
  }
  /**
   * シリーズ一覧を更新する
   */
  async updateSeriesList() {
    const seriesList = this.elements["series-list"];
    if (!seriesList) return;
    if (this.filteredSeriesStats.length === 0) {
      seriesList.innerHTML = "";
      this.showSeriesEmptyState(true);
      return;
    }
    this.showSeriesEmptyState(false);
    const items = await Promise.all(
      this.filteredSeriesStats.map((stats) => this.createSeriesItem(stats))
    );
    seriesList.innerHTML = items.join("");
    seriesList.querySelectorAll(".series-item").forEach((item, index) => {
      item.addEventListener("click", this.guardEvent((e) => {
        if (!e.target.closest(".series-nav-btn")) {
          void this.showSeriesDetail(this.filteredSeriesStats[index]);
        }
      }));
    });
    seriesList.querySelectorAll(".series-nav-btn").forEach((btn) => {
      btn.addEventListener("click", this.guardEvent((e) => {
        e.stopPropagation();
        const videoId = e.currentTarget.getAttribute("data-video-id");
        if (videoId) {
          void this.openVideoFromSeries(videoId);
        }
      }));
    });
  }
  /**
   * シリーズアラート一覧を更新する
   */
  updateSeriesAlertList() {
    const alertList = this.elements["series-alert-list"];
    if (!alertList) return;
    if (this.seriesAlerts.length === 0) {
      alertList.innerHTML = "";
      this.showSeriesAlertEmptyState(true);
      return;
    }
    this.showSeriesAlertEmptyState(false);
    const items = this.seriesAlerts.map((alert) => this.createSeriesAlertItem(alert));
    alertList.innerHTML = items.join("");
    alertList.querySelectorAll(".series-alert-item").forEach((item, index) => {
      const toggleBtn = item.querySelector(".alert-toggle");
      toggleBtn?.addEventListener("click", this.guardEvent((e) => {
        e.stopPropagation();
        void this.toggleSeriesAlert(this.seriesAlerts[index]);
      }));
      const deleteBtn = item.querySelector(".alert-delete");
      deleteBtn?.addEventListener("click", this.guardEvent((e) => {
        e.stopPropagation();
        void this.deleteSeriesAlert(this.seriesAlerts[index]);
      }));
    });
  }
  /**
   * シリーズアイテムのHTMLを生成する
   */
  async createSeriesItem(stats) {
    const lastWatchedDate = new Date(stats.lastWatchedAt);
    const progressPercent = Math.round(stats.progressRate * 100);
    const seriesInfo = await this.getSeriesInfo(stats.seriesId);
    return `
      <div class="series-item" data-series-id="${stats.seriesId}">
        <div class="series-content">
          <div class="series-header">
            <h3 class="series-title">${this.escapeHtml(stats.seriesTitle)}</h3>
            <div class="series-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
              </div>
              <span class="progress-text">${stats.watchedCount}/${stats.totalCount || "?"} (${progressPercent}%)</span>
            </div>
          </div>
          <div class="series-meta">
            <div class="series-stat">
              ${createMaterialIcon("video_library", { color: "dark", size: "small" })}
              <span>${stats.watchedCount}本視聴</span>
            </div>
            <div class="series-stat">
              ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
              <span>最終視聴: ${lastWatchedDate.toLocaleDateString("ja-JP")}</span>
            </div>
          </div>
          <div class="series-last-video">
            <span class="last-video-label">最後に視聴:</span>
            <span class="last-video-title">${this.escapeHtml(stats.lastVideoTitle)}</span>
          </div>
          ${seriesInfo ? this.createSeriesNavigationHTML(seriesInfo) : ""}
        </div>
      </div>
    `;
  }
  /**
   * シリーズアラートアイテムのHTMLを生成する
   */
  createSeriesAlertItem(alert) {
    const lastCheckedDate = new Date(alert.lastCheckedAt);
    const intervalMs = alert.checkInterval;
    let intervalText = "";
    if (intervalMs < 60 * 1e3) {
      intervalText = `${Math.round(intervalMs / 1e3)}秒`;
    } else if (intervalMs < 60 * 60 * 1e3) {
      intervalText = `${Math.round(intervalMs / (60 * 1e3))}分`;
    } else if (intervalMs < 24 * 60 * 60 * 1e3) {
      intervalText = `${Math.round(intervalMs / (60 * 60 * 1e3))}時間`;
    } else {
      intervalText = `${Math.round(intervalMs / (24 * 60 * 60 * 1e3))}日`;
    }
    const timeUntilCheck = alert.nextCheckAt - Date.now();
    const isOverdue = timeUntilCheck <= 0;
    let timeUntilText = "";
    if (isOverdue) {
      timeUntilText = "期限切れ";
    } else if (timeUntilCheck < 60 * 1e3) {
      timeUntilText = `${Math.round(timeUntilCheck / 1e3)}秒後`;
    } else if (timeUntilCheck < 60 * 60 * 1e3) {
      timeUntilText = `${Math.round(timeUntilCheck / (60 * 1e3))}分後`;
    } else if (timeUntilCheck < 24 * 60 * 60 * 1e3) {
      timeUntilText = `${Math.round(timeUntilCheck / (60 * 60 * 1e3))}時間後`;
    } else {
      timeUntilText = `${Math.round(timeUntilCheck / (24 * 60 * 60 * 1e3))}日後`;
    }
    return `
      <div class="series-alert-item" data-alert-id="${alert.id}">
        <div class="alert-content">
          <div class="alert-header">
            <h3 class="alert-title">${this.escapeHtml(alert.seriesTitle)}</h3>
            <div class="alert-status ${alert.enabled ? "enabled" : "disabled"}">
              ${alert.enabled ? "有効" : "無効"}
            </div>
          </div>
          <div class="alert-meta">
            <div class="alert-stat">
              ${createMaterialIcon("schedule", { color: "dark", size: "small" })}
              <span>${intervalText}間隔</span>
            </div>
            <div class="alert-stat">
              ${createMaterialIcon("update", { color: "dark", size: "small" })}
              <span class="${isOverdue ? "overdue" : ""}">次回チェック: ${timeUntilText}</span>
            </div>
            <div class="alert-stat">
              ${createMaterialIcon("history", { color: "dark", size: "small" })}
              <span>最終チェック: ${lastCheckedDate.toLocaleString("ja-JP")}</span>
            </div>
          </div>
          <div class="alert-last-video">
            <span class="last-video-label">最後に確認:</span>
            <span class="last-video-title">${this.escapeHtml(alert.lastVideoTitle)}</span>
          </div>
          <div class="alert-actions">
            <button class="alert-toggle btn btn-${alert.enabled ? "secondary" : "primary"} btn-sm">
              ${alert.enabled ? "無効にする" : "有効にする"}
            </button>
            <button class="alert-delete btn btn-danger btn-sm">
              削除
            </button>
          </div>
        </div>
      </div>
    `;
  }
  // ===== イベントハンドラ（シリーズ関連） =====
  /**
   * シリーズ検索を処理する
   */
  async handleSeriesSearch(event) {
    const input = event.target;
    this.seriesFilter.searchText = input.value.trim() || void 0;
    this.filterSeriesStats();
    await this.updateSeriesList();
    this.updateSeriesCount();
  }
  /**
   * シリーズ検索をクリアする
   */
  async clearSeriesSearch() {
    const searchInput = this.elements["series-search-input"];
    if (searchInput) {
      searchInput.value = "";
      this.seriesFilter.searchText = void 0;
      this.filterSeriesStats();
      await this.updateSeriesList();
      this.updateSeriesCount();
    }
  }
  /**
   * シリーズフィルタを処理する
   */
  async handleSeriesFilter() {
    const progressFilter = this.elements["series-progress-filter"];
    this.seriesFilter.progressFilter = progressFilter?.value || "all";
    this.filterSeriesStats();
    await this.updateSeriesList();
    this.updateSeriesCount();
  }
  /**
   * シリーズデータを更新する
   */
  async refreshSeriesData() {
    await this.loadSeriesData();
    await this.updateSeriesUI();
    this.showToast("シリーズデータを更新しました", "success");
  }
  /**
   * シリーズアラートデータを更新する
   */
  async refreshSeriesAlertData() {
    await this.loadSeriesAlertData();
    this.updateSeriesAlertUI();
    this.showToast("シリーズアラートデータを更新しました", "success");
  }
  /**
   * シリーズアラートモーダルを開く
   */
  openSeriesAlertModal() {
    if ("Notification" in window && Notification.permission === "denied") {
      this.openNotificationPermissionModal();
      return;
    }
    this.updateSeriesSelectOptions();
    this.elements["series-alert-modal"]?.classList.remove("hidden");
  }
  /**
   * シリーズアラートモーダルを閉じる
   */
  closeSeriesAlertModal() {
    this.elements["series-alert-modal"]?.classList.add("hidden");
  }
  /**
   * シリーズ詳細モーダルを閉じる
   */
  closeSeriesDetailModal() {
    this.elements["series-detail-modal"]?.classList.add("hidden");
    this.selectedSeries = null;
  }
  /**
   * シリーズアラートを保存する
   */
  async saveSeriesAlert() {
    const seriesSelect = this.elements["series-alert-series-select"];
    const intervalSelect = this.elements["series-alert-interval-select"];
    const enabledCheckbox = this.elements["series-alert-enabled"];
    if (!seriesSelect?.value) {
      this.showToast("シリーズを選択してください", "error");
      return;
    }
    const seriesId = parseInt(seriesSelect.value);
    const interval = parseInt(intervalSelect.value);
    const enabled = enabledCheckbox.checked;
    const existingAlert = this.seriesAlerts.find((alert) => alert.seriesId === seriesId);
    if (existingAlert) {
      this.showToast("このシリーズのアラートは既に存在します", "error");
      return;
    }
    const seriesStats = this.seriesStats.find((stats) => stats.seriesId === seriesId);
    if (!seriesStats) {
      this.showToast("シリーズが見つかりません", "error");
      return;
    }
    const now = Date.now();
    const newAlert = {
      id: `alert_${seriesId}_${now}`,
      seriesId,
      seriesTitle: seriesStats.seriesTitle,
      lastVideoId: seriesStats.lastVideoId,
      lastVideoTitle: seriesStats.lastVideoTitle,
      lastCheckedAt: now,
      nextCheckAt: now + interval,
      checkInterval: interval,
      enabled,
      createdAt: now,
      updatedAt: now
    };
    try {
      const result = await watchHistoryDB.saveSeriesAlert(newAlert);
      if (result.success) {
        this.seriesAlerts.push(newAlert);
        this.updateSeriesAlertUI();
        this.closeSeriesAlertModal();
        this.showToast("シリーズアラートを追加しました", "success");
      } else {
        this.showToast("シリーズアラートの保存に失敗しました", "error");
      }
    } catch (error) {
      logger.error("シリーズアラート保存エラー:", error);
      this.showToast("シリーズアラートの保存に失敗しました", "error");
    }
  }
  /**
   * シリーズ詳細からアラートを追加する
   */
  addAlertFromSeriesDetail() {
    if (!this.selectedSeries) return;
    const existingAlert = this.seriesAlerts.find((alert) => alert.seriesId === this.selectedSeries.seriesId);
    if (existingAlert) {
      this.showToast("このシリーズのアラートは既に存在します", "error");
      return;
    }
    this.closeSeriesDetailModal();
    this.openSeriesAlertModal();
    const seriesSelect = this.elements["series-alert-series-select"];
    if (seriesSelect) {
      seriesSelect.value = this.selectedSeries.seriesId.toString();
    }
  }
  /**
   * シリーズ詳細を表示する
   */
  async showSeriesDetail(stats) {
    this.selectedSeries = stats;
    const modalTitle = this.elements["series-detail-title"];
    if (modalTitle) {
      modalTitle.textContent = stats.seriesTitle;
    }
    const seriesInfo = await this.getSeriesInfo(stats.seriesId);
    const detailInfo = this.elements["series-detail-info"];
    if (detailInfo) {
      detailInfo.innerHTML = this.createSeriesDetailHTML(stats, seriesInfo);
    }
    try {
      const videosResult = await watchHistoryDB.getSeriesVideos(stats.seriesId);
      const detailVideos = this.elements["series-detail-videos"];
      if (detailVideos && videosResult.success && videosResult.data) {
        detailVideos.innerHTML = this.createSeriesVideosHTML(videosResult.data);
      }
    } catch (error) {
      logger.error("シリーズ動画取得エラー:", error);
    }
    this.elements["series-detail-modal"]?.classList.remove("hidden");
    this.elements["series-detail-modal"]?.querySelectorAll(".series-nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const videoId = e.currentTarget.getAttribute("data-video-id");
        if (videoId) {
          this.openVideoFromSeries(videoId);
        }
      });
    });
  }
  /**
   * シリーズ詳細HTMLを作成する
   */
  createSeriesDetailHTML(stats, seriesInfo) {
    const lastWatchedDate = new Date(stats.lastWatchedAt);
    const progressPercent = Math.round(stats.progressRate * 100);
    return `
      <div class="series-detail-grid">
        <div class="series-detail-stats">
          <div class="info-row">
            <span class="info-label">視聴動画数:</span>
            <span class="info-value">${stats.watchedCount}本</span>
          </div>
          <div class="info-row">
            <span class="info-label">進捗:</span>
            <span class="info-value">${progressPercent}%</span>
          </div>
          <div class="info-row">
            <span class="info-label">最終視聴:</span>
            <span class="info-value">${lastWatchedDate.toLocaleDateString("ja-JP")}</span>
          </div>
          <div class="info-row">
            <span class="info-label">最後に視聴した動画:</span>
            <span class="info-value">${this.escapeHtml(stats.lastVideoTitle)}</span>
          </div>
        </div>
        ${seriesInfo ? this.createSeriesNavigationHTML(seriesInfo) : ""}
      </div>
    `;
  }
  /**
   * シリーズ動画一覧HTMLを作成する
   */
  createSeriesVideosHTML(videos) {
    if (videos.length === 0) {
      return '<div class="series-videos-empty">このシリーズの動画がありません</div>';
    }
    const videoItems = videos.map((video) => {
      const watchedDate = new Date(video.watchedAt);
      let progressPercent = 0;
      if (video.lengthSec > 0) {
        progressPercent = Math.round(video.lastPosition / video.lengthSec * 100);
      }
      return `
        <div class="series-video-item" data-video-id="${video.videoId}">
          <div class="video-thumbnail">
            <img src="${video.thumbnailUrl}" alt="${this.escapeHtml(video.title)}" onerror="this.src='/default-thumbnail.jpg'">
            <div class="video-duration">${this.formatDuration(video.lengthSec)}</div>
          </div>
          <div class="video-content">
            <h4 class="video-title">${this.escapeHtml(video.title)}</h4>
            <div class="video-meta">
              <span class="video-watched-date">${watchedDate.toLocaleDateString("ja-JP")}</span>
              <span class="video-progress">${progressPercent}%</span>
            </div>
            <div class="video-progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join("");
    return `
      <div class="series-videos-header">
        <h4>シリーズ動画一覧 (${videos.length}本)</h4>
      </div>
      <div class="series-videos-list">
        ${videoItems}
      </div>
    `;
  }
  /**
   * シリーズアラートを切り替える
   */
  async toggleSeriesAlert(alert) {
    const updatedAlert = { ...alert, enabled: !alert.enabled, updatedAt: Date.now() };
    try {
      const result = await watchHistoryDB.saveSeriesAlert(updatedAlert);
      if (result.success) {
        const index = this.seriesAlerts.findIndex((a) => a.id === alert.id);
        if (index !== -1) {
          this.seriesAlerts[index] = updatedAlert;
        }
        this.updateSeriesAlertUI();
        this.showToast(`アラートを${updatedAlert.enabled ? "有効" : "無効"}にしました`, "success");
      } else {
        this.showToast("アラートの更新に失敗しました", "error");
      }
    } catch (error) {
      logger.error("アラート更新エラー:", error);
      this.showToast("アラートの更新に失敗しました", "error");
    }
  }
  /**
   * シリーズアラートを削除する
   */
  async deleteSeriesAlert(alert) {
    if (!confirm(`「${alert.seriesTitle}」のアラートを削除しますか？`)) {
      return;
    }
    try {
      const result = await watchHistoryDB.deleteSeriesAlert(alert.id);
      if (result.success) {
        this.seriesAlerts = this.seriesAlerts.filter((a) => a.id !== alert.id);
        this.updateSeriesAlertUI();
        this.showToast("アラートを削除しました", "success");
      } else {
        this.showToast("アラートの削除に失敗しました", "error");
      }
    } catch (error) {
      logger.error("アラート削除エラー:", error);
      this.showToast("アラートの削除に失敗しました", "error");
    }
  }
  // ===== 視聴履歴削除機能 =====
  /**
   * 個別の視聴履歴エントリを削除する
   */
  async deleteHistoryEntry(entry) {
    if (!confirm(`「${entry.title}」の視聴履歴を削除しますか？`)) {
      return;
    }
    try {
      const result = await watchHistoryDB.deleteEntry(entry.videoId);
      if (result.success) {
        this.entries = this.entries.filter((e) => e.videoId !== entry.videoId);
        this.filterEntries();
        this.updateHistoryList();
        this.updateContentCount();
        this.showToast("履歴を削除しました", "success");
      } else {
        this.showToast("履歴の削除に失敗しました", "error");
      }
    } catch (error) {
      logger.error("履歴削除エラー:", error);
      this.showToast("履歴の削除に失敗しました", "error");
    }
  }
  /**
   * 全ての視聴履歴を削除する（一括削除）
   */
  async deleteAllHistoryEntries() {
    const totalCount = this.entries.length;
    if (totalCount === 0) {
      this.showToast("削除する履歴がありません", "info");
      return;
    }
    if (!confirm(`全ての視聴履歴（${totalCount}件）を削除しますか？

この操作は取り消せません。`)) {
      return;
    }
    try {
      const result = await watchHistoryDB.deleteAllEntries();
      if (result.success && typeof result.data === "number") {
        this.entries = [];
        this.filteredEntries = [];
        this.updateHistoryList();
        this.updateContentCount();
        this.showToast(`${result.data}件の履歴を削除しました`, "success");
      } else {
        this.showToast("一括削除に失敗しました", "error");
      }
    } catch (error) {
      logger.error("一括削除エラー:", error);
      this.showToast("一括削除に失敗しました", "error");
    }
  }
  /**
   * 条件に一致する視聴履歴を削除する
   */
  async deleteHistoryEntriesByCondition(maxWatchCount, maxProgressRate) {
    if (maxWatchCount < 0 || maxProgressRate < 0 || maxProgressRate > 100) {
      this.showToast("無効な条件値です", "error");
      return;
    }
    const matchingEntries = this.entries.filter((entry) => {
      const progressRate = entry.lengthSec > 0 ? Math.round(entry.lastPosition / entry.lengthSec * 100) : 0;
      return entry.watchCount <= maxWatchCount && progressRate <= maxProgressRate;
    });
    if (matchingEntries.length === 0) {
      this.showToast("条件に一致する履歴がありません", "info");
      return;
    }
    if (!confirm(`${maxWatchCount}回以下視聴かつ${maxProgressRate}%以下進捗の履歴（${matchingEntries.length}件）を削除しますか？

この操作は取り消せません。`)) {
      return;
    }
    try {
      const result = await watchHistoryDB.deleteEntriesByCondition(maxWatchCount, maxProgressRate);
      if (result.success && typeof result.data === "number") {
        await this.refreshData();
        this.showToast(`${result.data}件の履歴を削除しました`, "success");
      } else {
        this.showToast("条件付き削除に失敗しました", "error");
      }
    } catch (error) {
      logger.error("条件付き削除エラー:", error);
      this.showToast("条件付き削除に失敗しました", "error");
    }
  }
  /**
   * 条件付き削除のハンドラー
   */
  handleConditionalDelete() {
    const watchCountInput = this.elements["delete-watch-count"];
    const progressRateInput = this.elements["delete-progress-rate"];
    if (!watchCountInput || !progressRateInput) {
      this.showToast("削除条件の入力フィールドが見つかりません", "error");
      return;
    }
    const maxWatchCount = parseInt(watchCountInput.value) || 0;
    const maxProgressRate = parseInt(progressRateInput.value) || 0;
    void this.deleteHistoryEntriesByCondition(maxWatchCount, maxProgressRate);
  }
  /**
   * シリーズ選択肢を更新する
   */
  updateSeriesSelectOptions() {
    const seriesSelect = this.elements["series-alert-series-select"];
    if (!seriesSelect) return;
    seriesSelect.innerHTML = '<option value="">シリーズを選択してください</option>';
    this.seriesStats.forEach((stats) => {
      const option = document.createElement("option");
      option.value = stats.seriesId.toString();
      option.textContent = stats.seriesTitle;
      seriesSelect.appendChild(option);
    });
  }
  /**
   * アラートチェックを開始する
   */
  startAlertCheck() {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }
    this.alertCheckInterval = setInterval(() => {
      void this.checkSeriesAlerts();
    }, 1 * 60 * 1e3);
    void this.checkSeriesAlerts();
  }
  /**
   * アラートUIの定期更新を開始する
   */
  startAlertUIUpdater() {
    setInterval(() => {
      if (this.elements["series-alert-tab"]?.classList.contains("active")) {
        this.updateSeriesAlertUI();
      }
    }, 10 * 1e3);
  }
  /**
   * シリーズアラートをチェックする
   */
  async checkSeriesAlerts() {
    try {
      const alertsResult = await watchHistoryDB.getAlertsToCheck();
      if (alertsResult.success && alertsResult.data) {
        const alertsToCheck = alertsResult.data;
        for (const alert of alertsToCheck) {
          await this.checkSingleAlert(alert);
        }
      }
    } catch (error) {
      logger.error("アラートチェックエラー:", error);
    }
  }
  /**
   * 単一のアラートをチェックする
   */
  async checkSingleAlert(alert) {
    try {
      const hasNewVideo = await this.checkForNewSeriesVideo(alert);
      const now = Date.now();
      const updatedAlert = {
        ...alert,
        lastCheckedAt: now,
        nextCheckAt: now + alert.checkInterval,
        updatedAt: now
      };
      await watchHistoryDB.saveSeriesAlert(updatedAlert);
      const index = this.seriesAlerts.findIndex((a) => a.id === alert.id);
      if (index !== -1) {
        this.seriesAlerts[index] = updatedAlert;
      }
      if (hasNewVideo) {
        this.showSeriesNotification(alert);
      }
      return hasNewVideo;
    } catch (error) {
      logger.error("個別アラートチェックエラー:", error);
      return false;
    }
  }
  /**
   * シリーズの新しい動画をチェックする
   */
  async checkForNewSeriesVideo(alert) {
    try {
      const seriesVideosResult = await watchHistoryDB.getSeriesVideos(alert.seriesId);
      if (!seriesVideosResult.success || !seriesVideosResult.data || seriesVideosResult.data.length === 0) {
        return false;
      }
      const latestVideo = seriesVideosResult.data[0];
      if (!latestVideo.series || !latestVideo.series.video.next) {
        return false;
      }
      const nextVideo = latestVideo.series.video.next;
      if (nextVideo.id !== alert.lastVideoId) {
        const updatedAlert = {
          ...alert,
          lastVideoId: nextVideo.id,
          lastVideoTitle: nextVideo.title,
          updatedAt: Date.now()
        };
        await watchHistoryDB.saveSeriesAlert(updatedAlert);
        const index = this.seriesAlerts.findIndex((a) => a.id === alert.id);
        if (index !== -1) {
          this.seriesAlerts[index] = updatedAlert;
        }
        return true;
      }
      return false;
    } catch (error) {
      logger.error("シリーズ動画チェックエラー:", error);
      return false;
    }
  }
  /**
   * シリーズ通知を表示する（ブラウザ通知のみ）
   */
  showSeriesNotification(alert) {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(`🎬 ${alert.seriesTitle}`, {
          body: `新しい動画「${alert.lastVideoTitle}」のネクストエピソードが投稿されました！`,
          icon: getIconPath("notifications"),
          tag: `series-${alert.seriesId}`,
          requireInteraction: true
        });
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(`🎬 ${alert.seriesTitle}`, {
              body: `新しい動画「${alert.lastVideoTitle}」のネクストエピソードが投稿されました！`,
              icon: getIconPath("notifications"),
              tag: `series-${alert.seriesId}`,
              requireInteraction: true
            });
          }
        }).catch((error) => {
          logger?.error("Notification permission request failed:", error);
        });
      }
    } else {
      console.warn("ブラウザ通知が利用できません");
    }
  }
  /**
   * 手動でアラートをチェックする
   */
  async manualCheckAlerts() {
    try {
      if (this.seriesAlerts.length === 0) {
        this.showToast("アラートがありません", "info");
        return;
      }
      const enabledAlerts = this.seriesAlerts.filter((alert) => alert.enabled);
      if (enabledAlerts.length === 0) {
        this.showToast("有効なアラートがありません", "info");
        return;
      }
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      this.showToast("アラートチェックを開始します...", "info");
      let checkedCount = 0;
      let notificationCount = 0;
      for (const alert of enabledAlerts) {
        const hasNewVideo = await this.checkSingleAlert(alert);
        checkedCount++;
        if (hasNewVideo) {
          notificationCount++;
        }
      }
      this.updateSeriesAlertUI();
      const notificationStatus = "Notification" in window ? Notification.permission === "granted" ? "ブラウザ通知有効" : "ブラウザ通知無効" : "ブラウザ通知未対応";
      this.showToast(
        `${checkedCount}件のアラートをチェックしました。${notificationCount}件の新しい動画が見つかりました。（${notificationStatus}）`,
        "success"
      );
    } catch (error) {
      logger.error("手動アラートチェックエラー:", error);
      this.showToast("アラートチェックに失敗しました", "error");
    }
  }
  /**
   * 通知権限を確認・要求する
   */
  async checkNotificationPermission() {
    try {
      if (!("Notification" in window)) {
        this.showToast("このブラウザはデスクトップ通知に対応していません", "error");
        return;
      }
      const permission = Notification.permission;
      if (permission === "granted") {
        this.showToast("ブラウザ通知は既に許可されています", "success");
        new Notification("🎬 シリーズアラート", {
          body: "通知権限が正常に動作しています！",
          icon: getIconPath("notifications"),
          tag: "permission-test"
        });
      } else if (permission === "denied") {
        this.openNotificationPermissionModal();
      } else {
        this.showToast("ブラウザ通知の許可を要求します...", "info");
        const result = await Notification.requestPermission();
        if (result === "granted") {
          this.showToast("ブラウザ通知が許可されました！", "success");
          new Notification("🎬 シリーズアラート", {
            body: "通知権限が正常に設定されました！",
            icon: getIconPath("notifications"),
            tag: "permission-granted"
          });
        } else {
          this.openNotificationPermissionModal();
        }
      }
    } catch (error) {
      logger.error("通知権限確認エラー:", error);
      this.showToast("通知権限の確認に失敗しました", "error");
    }
  }
  /**
   * 通知権限案内モーダルを開く
   */
  openNotificationPermissionModal() {
    this.elements["notification-permission-modal"]?.classList.remove("hidden");
    this.highlightCurrentBrowserInstructions();
  }
  /**
   * 通知権限案内モーダルを閉じる
   */
  closeNotificationPermissionModal() {
    this.elements["notification-permission-modal"]?.classList.add("hidden");
  }
  /**
   * 設定後の通知テストを実行する
   */
  async testNotificationAfterSetup() {
    try {
      if (!("Notification" in window)) {
        this.showToast("このブラウザはデスクトップ通知に対応していません", "error");
        return;
      }
      const permission = Notification.permission;
      if (permission === "granted") {
        new Notification("🎬 シリーズアラート", {
          body: "通知設定が正常に動作しています！設定完了です。",
          icon: getIconPath("notifications"),
          tag: "setup-test"
        });
        this.showToast("通知テストが送信されました！", "success");
        setTimeout(() => {
          this.closeNotificationPermissionModal();
        }, 1e3);
      } else if (permission === "denied") {
        this.showToast("まだ通知が拒否されています。上記の手順に従って設定を変更してください", "error");
      } else {
        this.showToast("通知の許可を要求します...", "info");
        const result = await Notification.requestPermission();
        if (result === "granted") {
          new Notification("🎬 シリーズアラート", {
            body: "通知設定が正常に完了しました！",
            icon: getIconPath("notifications"),
            tag: "setup-complete"
          });
          this.showToast("通知設定が完了しました！", "success");
          setTimeout(() => {
            this.closeNotificationPermissionModal();
          }, 1e3);
        } else {
          this.showToast("通知が拒否されました。上記の手順に従って手動で設定してください", "error");
        }
      }
    } catch (error) {
      logger.error("通知テストエラー:", error);
      this.showToast("通知テストに失敗しました", "error");
    }
  }
  /**
   * タブ移動時の通知権限チェックを行う
   */
  checkNotificationPermissionOnTab() {
    if ("Notification" in window && Notification.permission === "denied") {
      setTimeout(() => {
        this.showToast("ブラウザ通知が拒否されています。シリーズアラートを利用するには通知の許可が必要です", "error");
      }, 500);
    }
  }
  /**
   * 現在のブラウザに適した説明を強調表示する
   */
  highlightCurrentBrowserInstructions() {
    document.querySelectorAll(".browser-tab").forEach((tab) => {
      tab.classList.remove("current-browser");
    });
    const userAgent = navigator.userAgent;
    let currentBrowser = "";
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
      currentBrowser = "chrome";
    } else if (userAgent.includes("Edg")) {
      currentBrowser = "chrome";
    } else if (userAgent.includes("Firefox")) {
      currentBrowser = "firefox";
    } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      currentBrowser = "safari";
    } else {
      currentBrowser = "chrome";
    }
    const currentTab = document.getElementById(`${currentBrowser}-tab`);
    if (currentTab) {
      currentTab.classList.add("current-browser");
    }
  }
  // ===== ユーティリティメソッド（シリーズ関連） =====
  /**
   * シリーズ読み込み状態を表示する
   */
  showSeriesLoading(show) {
    const loading = this.elements["series-loading"];
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }
  /**
   * シリーズアラート読み込み状態を表示する
   */
  showSeriesAlertLoading(show) {
    const loading = this.elements["series-alert-loading"];
    if (loading) {
      loading.classList.toggle("hidden", !show);
    }
  }
  /**
   * シリーズ空の状態を表示する
   */
  showSeriesEmptyState(show) {
    const emptyState = this.elements["series-empty-state"];
    if (emptyState) {
      emptyState.classList.toggle("hidden", !show);
    }
  }
  /**
   * シリーズアラート空の状態を表示する
   */
  showSeriesAlertEmptyState(show) {
    const emptyState = this.elements["series-alert-empty-state"];
    if (emptyState) {
      emptyState.classList.toggle("hidden", !show);
    }
  }
  /**
   * シリーズ数を更新する
   */
  updateSeriesCount() {
    const seriesCount = this.elements["series-count"];
    if (seriesCount) {
      seriesCount.textContent = `${this.filteredSeriesStats.length} 件のシリーズ`;
    }
  }
  /**
   * シリーズアラート数を更新する
   */
  updateSeriesAlertCount() {
    const alertCount = this.elements["series-alert-count"];
    if (alertCount) {
      alertCount.textContent = `${this.seriesAlerts.length} 件のアラート`;
    }
  }
  /**
   * シリーズ情報を取得する
   */
  async getSeriesInfo(seriesId) {
    try {
      const videosResult = await watchHistoryDB.getSeriesVideos(seriesId);
      if (videosResult.success && videosResult.data && videosResult.data.length > 0) {
        for (const video of videosResult.data) {
          if (video.series && video.series.id === seriesId) {
            return video.series;
          }
        }
      }
      return null;
    } catch (error) {
      logger.error("シリーズ情報取得エラー:", error);
      return null;
    }
  }
  /**
   * シリーズナビゲーションHTMLを作成する
   */
  createSeriesNavigationHTML(seriesInfo) {
    const { video } = seriesInfo;
    const navigationItems = [];
    if (video.first) {
      navigationItems.push(`
        <button class="series-nav-btn" data-video-id="${video.first.id}" title="第1話: ${this.escapeHtml(video.first.title)}">
          ${createMaterialIcon("first_page", { color: "white", size: "small" })}
          <span>第1話</span>
        </button>
      `);
    }
    if (video.prev) {
      navigationItems.push(`
        <button class="series-nav-btn" data-video-id="${video.prev.id}" title="前の話: ${this.escapeHtml(video.prev.title)}">
          ${createMaterialIcon("navigate_before", { color: "white", size: "small" })}
          <span>前の話</span>
        </button>
      `);
    }
    if (video.next) {
      navigationItems.push(`
        <button class="series-nav-btn" data-video-id="${video.next.id}" title="次の話: ${this.escapeHtml(video.next.title)}">
          <span>次の話</span>
          ${createMaterialIcon("navigate_next", { color: "white", size: "small" })}
        </button>
      `);
    }
    if (navigationItems.length === 0) {
      return "";
    }
    return `
      <div class="series-navigation">
        <div class="series-nav-header">
          ${createMaterialIcon("play_arrow", { color: "dark", size: "small" })}
          <span>シリーズナビゲーション</span>
        </div>
        <div class="series-nav-buttons">
          ${navigationItems.join("")}
        </div>
      </div>
    `;
  }
  /**
   * シリーズから動画を開く
   */
  openVideoFromSeries(videoId) {
    const url = `https://www.nicovideo.jp/watch/${videoId}`;
    window.open(url, "_blank");
    this.showToast("動画を開きました", "success");
  }
  // ===== データベース管理関連メソッド =====
  /**
   * データベース管理モーダルを開く
   */
  async openDatabaseManagementModal() {
    await this.refreshPersistenceStatus();
    await this.refreshDatabaseConfig();
    await this.refreshBackupList();
    this.elements["database-management-modal"]?.classList.remove("hidden");
  }
  /**
   * データベース管理モーダルを閉じる
   */
  closeDatabaseManagementModal() {
    this.elements["database-management-modal"]?.classList.add("hidden");
  }
  /**
   * 永続化を要求する
   */
  async requestPersistence() {
    try {
      const result = await watchHistoryDB.requestPersistence();
      if (result.success) {
        if (result.data) {
          this.showToast("データベースの永続化に成功しました", "success");
        } else {
          this.showToast("データベースの永続化に失敗しました", "error");
        }
      } else {
        this.showToast(result.error || "永続化要求に失敗しました", "error");
      }
      await this.refreshPersistenceStatus();
    } catch (error) {
      logger.error("永続化要求エラー:", error);
      this.showToast("永続化要求に失敗しました", "error");
    }
  }
  /**
   * 永続化状態を更新する
   */
  async refreshPersistenceStatus() {
    try {
      const result = await watchHistoryDB.getPersistenceStatus();
      if (result.success && result.data) {
        this.persistenceStatus = result.data;
        this.updatePersistenceUI();
      } else {
        logger.error("永続化状態取得エラー:", result.error);
      }
    } catch (error) {
      logger.error("永続化状態取得エラー:", error);
    }
  }
  /**
   * マイグレーションを実行する
   */
  async runMigration() {
    try {
      const result = await watchHistoryDB.runMigration();
      if (result.success) {
        this.showToast("マイグレーションが完了しました", "success");
      } else {
        this.showToast(result.error || "マイグレーションに失敗しました", "error");
      }
    } catch (error) {
      logger.error("マイグレーション実行エラー:", error);
      this.showToast("マイグレーションに失敗しました", "error");
    }
  }
  /**
   * マイグレーション状態を確認する
   */
  checkMigrationStatus() {
    this.migrationProgress = watchHistoryDB.getMigrationProgress();
    this.updateMigrationUI();
  }
  /**
   * バックアップを作成する
   */
  async createBackup() {
    try {
      const result = await watchHistoryDB.exportData();
      if (result.success && result.data) {
        const backup = {
          version: 2,
          timestamp: Date.now(),
          watchHistory: result.data.entries,
          seriesAlerts: result.data.seriesAlerts
        };
        const backupKey = `watch-history-backup-${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(backup));
        this.showToast("バックアップを作成しました", "success");
        await this.refreshBackupList();
      } else {
        this.showToast("バックアップの作成に失敗しました", "error");
      }
    } catch (error) {
      logger.error("バックアップ作成エラー:", error);
      this.showToast("バックアップの作成に失敗しました", "error");
    }
  }
  /**
   * バックアップリストを更新します
   */
  async refreshBackupList() {
    await Promise.resolve();
    try {
      const backups = watchHistoryDB.getAvailableBackups();
      this.updateBackupListUI(backups);
    } catch (error) {
      logger.error("バックアップリスト取得エラー:", error);
    }
  }
  /**
   * データベース設定を更新する
   */
  updateDatabaseConfig() {
    const autoMigration = this.elements["auto-migration-checkbox"]?.checked || false;
    const autoPersist = this.elements["auto-persist-checkbox"]?.checked || false;
    const autoBackup = this.elements["auto-backup-checkbox"]?.checked || false;
    const backupBeforeMigration = this.elements["backup-before-migration-checkbox"]?.checked || false;
    const config = {
      autoMigration,
      autoPersist,
      autoBackup,
      backupBeforeMigration
    };
    watchHistoryDB.updateMigrationConfig(config);
    this.showToast("設定を更新しました", "success");
  }
  /**
   * データベース設定を更新
   */
  async refreshDatabaseConfig() {
    await Promise.resolve();
    try {
      this.databaseConfig = watchHistoryDB.getMigrationConfig();
      this.updateDatabaseConfigUI();
    } catch (error) {
      logger.error("データベース設定取得エラー:", error);
    }
  }
  /**
   * マイグレーション進捗を処理する
   */
  handleMigrationProgress(event) {
    const progress = event.detail;
    this.migrationProgress = progress;
    this.updateMigrationUI();
  }
  /**
   * 永続化UIを更新する
   */
  updatePersistenceUI() {
    if (!this.persistenceStatus) return;
    const badge = this.elements["persistence-badge"];
    const statusText = this.elements["persistence-status-text"];
    const usageFill = this.elements["storage-usage-fill"];
    const usageText = this.elements["storage-usage-text"];
    if (statusText) {
      statusText.textContent = this.persistenceStatus.isPersistent ? "永続化済み" : "一時的";
    }
    if (badge) {
      badge.className = `persistence-badge ${this.persistenceStatus.isPersistent ? "persistent" : "temporary"}`;
    }
    if (usageFill) {
      const usagePercent = Math.round(this.persistenceStatus.usageRate * 100);
      usageFill.style.width = `${usagePercent}%`;
    }
    if (usageText) {
      const usageFormatted = this.formatBytes(this.persistenceStatus.usage);
      const quotaFormatted = this.formatBytes(this.persistenceStatus.quota);
      const usagePercent = Math.round(this.persistenceStatus.usageRate * 100);
      usageText.textContent = `${usageFormatted} / ${quotaFormatted} (${usagePercent}%)`;
    }
  }
  /**
   * マイグレーションUIを更新する
   */
  updateMigrationUI() {
    if (!this.migrationProgress) return;
    const container = this.elements["migration-progress-container"];
    const currentTask = this.elements["migration-current-task"];
    const progressFill = this.elements["migration-progress-fill"];
    const progressText = this.elements["migration-progress-text"];
    if (container) {
      container.classList.toggle("hidden", !this.migrationProgress.isRunning);
    }
    if (currentTask) {
      currentTask.textContent = this.migrationProgress.currentMigration || "マイグレーション待機中";
    }
    if (progressFill) {
      const progressPercent = Math.round(this.migrationProgress.progress * 100);
      progressFill.style.width = `${progressPercent}%`;
    }
    if (progressText) {
      progressText.textContent = `${this.migrationProgress.completedCount} / ${this.migrationProgress.totalCount} (${Math.round(this.migrationProgress.progress * 100)}%)`;
    }
  }
  /**
   * データベース設定UIを更新する
   */
  updateDatabaseConfigUI() {
    if (!this.databaseConfig) return;
    const autoMigrationCheckbox = this.elements["auto-migration-checkbox"];
    const autoPersistCheckbox = this.elements["auto-persist-checkbox"];
    const autoBackupCheckbox = this.elements["auto-backup-checkbox"];
    const backupBeforeMigrationCheckbox = this.elements["backup-before-migration-checkbox"];
    if (autoMigrationCheckbox) {
      autoMigrationCheckbox.checked = this.databaseConfig.autoMigration;
    }
    if (autoPersistCheckbox) {
      autoPersistCheckbox.checked = this.databaseConfig.autoPersist;
    }
    if (autoBackupCheckbox) {
      autoBackupCheckbox.checked = this.databaseConfig.autoBackup;
    }
    if (backupBeforeMigrationCheckbox) {
      backupBeforeMigrationCheckbox.checked = this.databaseConfig.backupBeforeMigration;
    }
  }
  /**
   * バックアップリストUIを更新する
   */
  updateBackupListUI(backups) {
    const container = this.elements["backup-list-container"];
    if (!container) return;
    if (backups.length === 0) {
      container.innerHTML = '<div class="backup-list-empty"><span>バックアップがありません</span></div>';
      return;
    }
    const backupItems = backups.map((backup) => {
      const date = new Date(backup.timestamp);
      return `
        <div class="backup-item" data-backup-key="${backup.key}">
          <div class="backup-info">
            <div class="backup-date">${date.toLocaleString("ja-JP")}</div>
            <div class="backup-version">バージョン ${backup.version}</div>
          </div>
          <div class="backup-actions">
            <button class="backup-restore-btn btn btn-sm btn-primary" data-backup-key="${backup.key}">
              復元
            </button>
            <button class="backup-delete-btn btn btn-sm btn-danger" data-backup-key="${backup.key}">
              削除
            </button>
          </div>
        </div>
      `;
    }).join("");
    container.innerHTML = backupItems;
    container.querySelectorAll(".backup-restore-btn").forEach((btn) => {
      btn.addEventListener("click", this.guardEvent(async (e) => {
        const backupKey = e.target.getAttribute("data-backup-key");
        if (backupKey) {
          await this.restoreBackup(backupKey);
        }
      }));
    });
    container.querySelectorAll(".backup-delete-btn").forEach((btn) => {
      btn.addEventListener("click", this.guardEvent((e) => {
        const backupKey = e.target.getAttribute("data-backup-key");
        if (backupKey) {
          void this.deleteBackup(backupKey);
        }
      }));
    });
  }
  /**
   * バックアップを復元する
   */
  async restoreBackup(backupKey) {
    if (!confirm("バックアップを復元しますか？現在のデータは失われます。")) {
      return;
    }
    try {
      const result = await watchHistoryDB.restoreFromBackup(backupKey);
      if (result.success) {
        this.showToast("バックアップを復元しました", "success");
        await this.refreshData();
      } else {
        this.showToast(result.error || "バックアップの復元に失敗しました", "error");
      }
    } catch (error) {
      logger.error("バックアップ復元エラー:", error);
      this.showToast("バックアップの復元に失敗しました", "error");
    }
  }
  /**
   * バックアップを削除する
   */
  deleteBackup(backupKey) {
    if (!confirm("バックアップを削除しますか？")) {
      return;
    }
    try {
      localStorage.removeItem(backupKey);
      this.showToast("バックアップを削除しました", "success");
      void this.refreshBackupList();
    } catch (error) {
      logger.error("バックアップ削除エラー:", error);
      this.showToast("バックアップの削除に失敗しました", "error");
    }
  }
  /**
   * バイト数をフォーマットする
   */
  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
document.addEventListener("DOMContentLoaded", () => new WatchHistoryApp());
//# sourceMappingURL=watch-history.es.js.map
