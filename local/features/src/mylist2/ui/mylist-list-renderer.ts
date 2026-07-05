import type { MylistInfo } from "@/types/mylist-types";

export type MylistWithCount = MylistInfo & { videoCount: number };

export function renderMylistListItems(
  container: HTMLElement,
  mylists: MylistWithCount[],
  currentMylistId: number | null,
  onSelect: (mylistId: number) => void,
): void {
  const fragment = document.createDocumentFragment();

  for (const mylist of mylists) {
    if (mylist.id === undefined) continue;

    const item = document.createElement("div");
    item.className = "mylist-item";
    if (currentMylistId === mylist.id) {
      item.classList.add("active");
    }
    item.dataset.id = mylist.id.toString();

    const info = document.createElement("div");
    info.className = "mylist-info";
    const details = document.createElement("div");
    details.className = "mylist-details";
    const name = document.createElement("span");
    name.className = "mylist-name";
    name.textContent = mylist.name;
    const date = document.createElement("span");
    date.className = "mylist-date";
    date.textContent = new Date(mylist.createdAt).toLocaleDateString();
    details.append(name, date);

    const count = document.createElement("span");
    count.className = "mylist-count-mylist-tab";
    count.textContent = `${mylist.videoCount}件`;

    info.append(details, count);
    item.appendChild(info);
    item.addEventListener("click", () => {
      if (mylist.id !== undefined) {
        onSelect(mylist.id);
      }
    });
    fragment.appendChild(item);
  }

  container.replaceChildren(fragment);
}
