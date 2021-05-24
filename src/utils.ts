const replaceAll = (s: string, search: string, replace: string) => {
    return s.split(search).join(replace);
}

export { replaceAll }
