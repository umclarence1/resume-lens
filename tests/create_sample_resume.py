from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def build_sample_resume(path: str) -> None:
    page = canvas.Canvas(path, pagesize=A4)
    width, height = A4
    left = 54
    y = height - 58

    page.setFont("Helvetica-Bold", 19)
    page.drawString(left, y, "AMA MENSAH")
    y -= 20
    page.setFont("Helvetica", 9)
    page.drawString(left, y, "Accra, Ghana | ama@example.com | github.com/amamensah")

    def heading(title: str) -> None:
        nonlocal y
        y -= 30
        page.setFont("Helvetica-Bold", 11)
        page.drawString(left, y, title)
        y -= 7
        page.line(left, y, width - left, y)
        y -= 16

    def line(text: str, bold: bool = False) -> None:
        nonlocal y
        page.setFont("Helvetica-Bold" if bold else "Helvetica", 9.5)
        page.drawString(left, y, text)
        y -= 15

    heading("SUMMARY")
    line("Graduate software engineer who builds responsive web applications and REST APIs.")

    heading("SKILLS")
    line("React, JavaScript, Python, FastAPI, REST APIs, Git, HTML, CSS, SQL")

    heading("PROJECTS")
    line("Student Records Portal", bold=True)
    line("- Built a React web application for administrators to manage student records.")
    line("- Integrated REST endpoints and reduced duplicate data entry.")
    line("- Collaborated with two developers using Git and code reviews.")
    y -= 5
    line("IoT Energy Monitor", bold=True)
    line("- Created a dashboard that visualized readings from connected energy sensors.")
    line("- Debugged data inconsistencies and documented the installation process.")

    heading("EXPERIENCE")
    line("Software Engineering Intern | Example Labs", bold=True)
    line("- Fixed application bugs and supported feature development.")
    line("- Worked with the engineering team to test releases.")

    heading("EDUCATION")
    line("BSc Electrical and Electronic Engineering | 2025")

    page.save()


if __name__ == "__main__":
    build_sample_resume("tests/sample-resume.pdf")
