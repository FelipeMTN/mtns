const trim = (string: string, max: number) => {
	return string.length > max ? `${string.slice(0, max - 3)}...` : string;
};

export default trim;
