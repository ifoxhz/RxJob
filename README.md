# RxJob
the package implement a light job framework base rx.


const Jobtest = new Job()

const task = {
	fn: console.log,
        args: i
}

jobtest.addTask(task)
jobtest.process()

