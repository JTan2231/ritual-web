export interface User {
    email: string;
    password: string;
}

export interface Entry {
    id: string;
    createdDate: Date;
    content: string;
}

export interface JSONifiedHTML {
    tag: string;
    attributes: { [key: string]: string };
    children: JSONifiedHTML[];
    text?: string;
};

export interface Newsletter {
    id: string;
    createdDate: Date;
    content: string;
    color: string;
    html?: JSONifiedHTML;
}

