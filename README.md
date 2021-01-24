# Generator Prototype

This project is a small thought experiment in eliminating the use of client cursors in query pagination.

Pagination is a common pattern in systems that pass large datasets over networks, often between clients and servers, where the client issues a query that may run a long time, or its result set is so large as to be impractical to transfer in a single batch.

The concept originated with a question:

> How would I implement Python’s generator (`yield`) in an IPC model or distributed system?

By moving paging to the server side, the client implementation should be somewhat simpler.

The downside of this approach is that if (when) a client fails to correctly process a page, the page is effectively lost. The server provides no facility to retry a single page of the query. Therefore, it’s important for the client to correct handling of each page. In principle, this is still similar to Python’s generators: the consumer of a generator is responsible for its own behavior in handling each item produced.


Ideas for future improvements on this experiment:
* Structure the Client as an array interface, with a `.map()`, `.filter()` etc. 
