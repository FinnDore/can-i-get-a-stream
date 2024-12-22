create table `streams` (
    `id` varchar(255) not null primary key,
    `name` varchar(255) not null,
    `description` varchar(255) not null,
    `startTime` datetime not null,
    `width` int not null,
    `height` int not null
);